import type { SceneCommand } from "./schema";

export type SceneObjectKind = "graph" | "comparison" | "code" | "text" | "timeline" | "object";

export type SceneObject = {
  id: string;
  kind: SceneObjectKind;
  position: "avatarLeft" | "avatarRight" | "center" | "above";
  title?: string;
  text?: string;
  code?: string;
  left?: { title: string; body: string };
  right?: { title: string; body: string };
  items?: string[];
  highlight?: string;
};

export type SceneState = {
  objects: SceneObject[];
  cameraTarget: string | null;
  cameraStyle: "focus" | "wide";
  lookAt: string;
  highlight: string | null;
};

export function emptyScene(): SceneState {
  return {
    objects: [],
    cameraTarget: null,
    cameraStyle: "wide",
    lookAt: "visitor",
    highlight: null,
  };
}

function upsert(state: SceneState, object: SceneObject): SceneState {
  return {
    ...state,
    objects: [...state.objects.filter((item) => item.id !== object.id), object],
  };
}

function remove(state: SceneState, id: string): SceneState {
  return {
    ...state,
    objects: state.objects.filter((item) => item.id !== id),
    highlight: state.highlight === id ? null : state.highlight,
    cameraTarget: state.cameraTarget === id ? null : state.cameraTarget,
  };
}

export function applyCommand(state: SceneState, command: SceneCommand): SceneState {
  switch (command.action) {
    case "spawn":
      return upsert(state, {
        id: command.id,
        kind: "object",
        position: command.position,
        title: command.object,
      });
    case "remove":
    case "collapse":
      return remove(state, command.id);
    case "move":
      return {
        ...state,
        objects: state.objects.map((item) =>
          item.id === command.id ? { ...item, position: command.position } : item,
        ),
      };
    case "highlight":
      return { ...state, highlight: command.target };
    case "pointAt":
    case "lookAt":
      return { ...state, lookAt: command.target };
    case "zoomTo":
      return { ...state, cameraTarget: command.target, cameraStyle: command.style };
    case "showCode":
      return upsert(state, {
        id: command.id,
        kind: "code",
        position: command.position,
        title: command.title,
        code: command.code,
      });
    case "showGraph":
      return upsert(state, {
        id: command.id,
        kind: "graph",
        position: command.position,
        title: command.title,
      });
    case "showText":
      return upsert(state, {
        id: command.id,
        kind: "text",
        position: command.position,
        text: command.text,
      });
    case "compare":
      return upsert(state, {
        id: command.id,
        kind: "comparison",
        position: command.position,
        left: command.left,
        right: command.right,
      });
    case "showTimeline":
      return upsert(state, {
        id: command.id,
        kind: "timeline",
        position: command.position,
        items: command.items,
      });
    case "playAnimation":
      return state;
    default:
      return state;
  }
}

export function applyCommands(state: SceneState, commands: SceneCommand[]): SceneState {
  return commands.reduce(applyCommand, state);
}
