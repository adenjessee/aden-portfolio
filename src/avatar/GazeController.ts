import type { VRM } from "@pixiv/three-vrm";
import { Object3D, Vector3 } from "three";

export class GazeController {
  readonly target = new Object3D();
  private named = new Map<string, Vector3>();

  constructor() {
    this.named.set("visitor", new Vector3(0, 1.4, 2.4));
    this.named.set("avatarLeft", new Vector3(-1.4, 1.3, 0.4));
    this.named.set("avatarRight", new Vector3(1.4, 1.3, 0.4));
    this.named.set("repositoryGraph", new Vector3(-1.5, 1.35, 0.2));
    this.named.set("hiddenDependency", new Vector3(-1.2, 1.1, 0.2));
    this.named.set("ccvv", new Vector3(1.3, 1.3, 0.2));
    this.named.set("residency", new Vector3(1.3, 1.3, 0.2));
    this.named.set("compare", new Vector3(0, 1.5, 0.6));
    this.target.position.copy(this.named.get("visitor")!);
  }

  register(name: string, position: Vector3): void {
    this.named.set(name, position.clone());
  }

  lookAt(name: string): void {
    const point = this.named.get(name) ?? this.named.get("visitor");
    if (point) this.target.position.copy(point);
  }

  followPointer(nx: number, ny: number): void {
    this.target.position.set(nx * 0.8, 1.35 + ny * 0.25, 2.2);
  }

  attach(vrm: VRM): void {
    if (vrm.lookAt) vrm.lookAt.target = this.target;
  }
}
