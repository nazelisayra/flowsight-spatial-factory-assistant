// Opening "walk-up": on glasses the camera is the wearer's head and cannot be
// moved, so the station starts further away and glides to its resting place,
// like a technician walking up to the machine. Smooth start and stop, no head
// bob (swaying the world on a see-through display causes discomfort).
// Add this to the station root; children (machine, FX, callouts) move with it.

@component
export class FlowSightIntro extends BaseScriptComponent {
  @ui.label("<b>FlowSight Walk-up Intro</b>")
  @ui.separator
  @ui.group_start("Approach")
  @input
  @hint("Play the walk-up when the Lens starts")
  playOnStart: boolean = true

  @input
  @hint("Extra distance the station starts away from its resting place, in cm")
  @widget(new SliderWidget(50, 500, 10))
  approachDistance: number = 220

  @input
  @hint("Pause before walking starts, in seconds")
  @widget(new SliderWidget(0, 3, 0.1))
  startDelay: number = 0.8

  @input
  @hint("Walk duration in seconds (≈ 0.5 m/s at the default distance)")
  @widget(new SliderWidget(1, 10, 0.1))
  duration: number = 4.5
  @ui.group_end

  @ui.group_start("Reveal on arrival")
  @input
  @hint("Panel shown once the walk-up ends (the status card)")
  @allowUndefined
  revealOnArrival: SceneObject

  @input
  @hint("Pop-in time for the revealed panel, in seconds")
  @widget(new SliderWidget(0.1, 1, 0.05))
  revealDuration: number = 0.35
  @ui.group_end

  private restPosition = vec3.zero()
  private startPosition = vec3.zero()
  private revealScale = vec3.one()
  private elapsed = 0
  private phase: "idle" | "walking" | "revealing" | "done" = "idle"

  onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => this.onStart())
    this.createEvent("UpdateEvent").bind(() => this.onUpdate(getDeltaTime()))
  }

  /** Restarts the walk-up from the far position. */
  play(): void {
    const t = this.sceneObject.getTransform()
    t.setWorldPosition(this.startPosition)
    this.elapsed = 0
    this.phase = "walking"
    if (this.revealOnArrival) this.revealOnArrival.enabled = false
  }

  private onStart(): void {
    const t = this.sceneObject.getTransform()
    this.restPosition = t.getWorldPosition()
    // Walk in along the horizontal line from the viewer (Lens start pose) to the station.
    const flat = new vec3(this.restPosition.x, 0, this.restPosition.z)
    const away = flat.length > 1 ? flat.normalize() : new vec3(0, 0, -1)
    this.startPosition = this.restPosition.add(away.uniformScale(this.approachDistance))
    if (this.revealOnArrival) this.revealScale = this.revealOnArrival.getTransform().getLocalScale()
    if (this.playOnStart) {
      t.setWorldPosition(this.startPosition)
      this.phase = "walking"
    }
  }

  private onUpdate(dt: number): void {
    if (this.phase === "idle" || this.phase === "done") return
    this.elapsed += dt

    if (this.phase === "walking") {
      // Panels are hidden on the first update, after UIKit has initialised them.
      if (this.revealOnArrival && this.revealOnArrival.enabled) this.revealOnArrival.enabled = false
      const k = clamp01((this.elapsed - this.startDelay) / this.duration)
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * k)   // ease-in-out, like starting and stopping a walk
      this.sceneObject.getTransform().setWorldPosition(vec3.lerp(this.startPosition, this.restPosition, eased))
      if (k >= 1) {
        this.elapsed = 0
        this.phase = this.revealOnArrival ? "revealing" : "done"
        if (this.revealOnArrival) {
          this.revealOnArrival.getTransform().setLocalScale(this.revealScale.uniformScale(0.85))
          this.revealOnArrival.enabled = true
        }
      }
      return
    }

    // Revealing: quick ease-out pop to full size.
    const r = clamp01(this.elapsed / this.revealDuration)
    const s = 0.85 + 0.15 * (1 - Math.pow(1 - r, 3))
    this.revealOnArrival.getTransform().setLocalScale(this.revealScale.uniformScale(s))
    if (r >= 1) this.phase = "done"
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}
