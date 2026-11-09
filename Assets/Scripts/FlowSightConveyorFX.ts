// Lightweight procedural animation for the imported conveyor (the model has no
// animation of its own): spins the 36 rollers, moves simulated parcels along the
// belt, jams them at the transfer point during congestion, and pulses an
// additive highlight volume over the affected zone.

export type HighlightMode = "off" | "warning" | "inspection" | "resolved"

const ROLLER_NAME = /^sm_roller\d+_a61_mesh_00$/

interface Parcel {
  so: SceneObject
  transform: Transform
  s: number          // distance travelled along the belt, cm
  lane: number       // sideways offset, cm
  skew: number       // current yaw skew, degrees
  active: boolean
}

@component
export class FlowSightConveyorFX extends BaseScriptComponent {
  @ui.label("<b>FlowSight Conveyor FX</b>")
  @ui.separator
  @ui.group_start("Model references")
  @input
  @hint("Model node that contains the roller meshes (searched recursively)")
  rollerRoot: SceneObject

  @input
  @hint("Roller radius in cm, measured from the model")
  rollerRadiusCm: number = 2.9

  @input
  @hint("Belt surface at the infeed end")
  beltStart: SceneObject

  @input
  @hint("Belt surface at the outfeed end")
  beltEnd: SceneObject

  @input
  @hint("Transfer point where parcels jam during congestion")
  jamPoint: SceneObject

  @input
  @hint("Centre of the congestion highlight volume")
  zoneCenter: SceneObject
  @ui.group_end

  @ui.group_start("Parcels")
  @input
  @hint("Box mesh for parcels and the highlight volume")
  boxMesh: RenderMesh

  @input
  @hint("Parcel material")
  parcelMaterial: Material

  @input
  @hint("Parcel size in cm: length along the belt, height, width across")
  parcelSize: vec3 = new vec3(34, 22, 40)

  @input
  @hint("Gap between queued parcels in cm")
  @widget(new SliderWidget(2, 30, 1))
  queueGap: number = 6

  @input
  @hint("Distance between parcels in free flow, cm")
  @widget(new SliderWidget(50, 200, 5))
  flowSpacing: number = 95

  @input
  @hint("Visual speed as a fraction of the simulated belt speed (keeps motion readable)")
  @widget(new SliderWidget(0.1, 1, 0.05))
  visualSpeedScale: number = 0.4

  @input
  @hint("How many parcels to pool")
  poolSize: number = 10
  @ui.group_end

  @ui.group_start("Highlight")
  @input
  @hint("Additive material for the congestion volume")
  highlightMaterial: Material

  @input
  @hint("Highlight volume size in cm (along belt, height, across)")
  zoneSize: vec3 = new vec3(80, 34, 100)

  @input
  @hint("Thickness of the highlight's wireframe edges in cm")
  @widget(new SliderWidget(0.5, 5, 0.1))
  edgeThickness: number = 1.6

  @input
  @hint("Warning colour")
  @widget(new ColorWidget())
  warningColor: vec3 = new vec3(1.0, 0.55, 0.08)

  @input
  @hint("Resolved flash colour")
  @widget(new ColorWidget())
  resolvedColor: vec3 = new vec3(0.3, 0.95, 0.45)
  @ui.group_end

  private rollers: Transform[] = []
  private rollerBase: quat[] = []
  private rollerAngle = 0

  private parcels: Parcel[] = []
  private origin = vec3.zero()
  private dir = vec3.right()
  private side = vec3.forward()
  private up = vec3.up()
  private length = 400
  private jamS = 120
  private baseRotation = quat.quatIdentity()

  private speedMps = 1.2
  private jammed = false
  private spawnTimer = 0

  private highlight: SceneObject
  private highlightMat: Material
  private highlightMode: HighlightMode = "off"
  private modeTime = 0
  private time = 0

  onAwake(): void {
    this.collectRollers(this.rollerRoot)
    this.setupPath()
    this.buildParcels()
    this.buildHighlight()
    this.createEvent("UpdateEvent").bind(() => this.update(getDeltaTime()))
  }

  /** Simulated belt speed in m/s; drives rollers and parcels. */
  setBeltSpeed(mps: number): void {
    this.speedMps = Math.max(0, mps)
  }

  /** Blocks parcels at the transfer point (first parcel skews, the rest queue). */
  setJam(jammed: boolean): void {
    this.jammed = jammed
  }

  setHighlight(mode: HighlightMode): void {
    if (mode === this.highlightMode) return
    this.highlightMode = mode
    this.modeTime = 0
    this.highlight.enabled = mode !== "off"
  }

  private update(dt: number): void {
    this.time += dt
    this.modeTime += dt
    const v = this.speedMps * 100 * this.visualSpeedScale   // cm/s

    this.rollerAngle += (v / this.rollerRadiusCm) * dt
    const spin = quat.angleAxis(this.rollerAngle, vec3.right())
    for (let i = 0; i < this.rollers.length; i++) {
      this.rollers[i].setLocalRotation(this.rollerBase[i].multiply(spin))
    }

    this.updateParcels(v, dt)
    this.updateHighlight()
  }

  // ── Rollers ──────────────────────────────────────────────────────────────
  private collectRollers(so: SceneObject): void {
    if (!so) return
    if (ROLLER_NAME.test(so.name)) {
      const t = so.getTransform()
      this.rollers.push(t)
      this.rollerBase.push(t.getLocalRotation())
    }
    for (let i = 0; i < so.getChildrenCount(); i++) this.collectRollers(so.getChild(i))
  }

  // ── Parcels ──────────────────────────────────────────────────────────────
  // Everything is computed in this object's local space so parcels and the
  // highlight stay attached to the station if the station moves (e.g. the intro).
  private toLocal(so: SceneObject): vec3 {
    const inv = this.sceneObject.getTransform().getInvertedWorldTransform()
    return inv.multiplyPoint(so.getTransform().getWorldPosition())
  }

  private setupPath(): void {
    const inv = this.sceneObject.getTransform().getInvertedWorldTransform()
    this.up = inv.multiplyDirection(vec3.up()).normalize()
    const a = this.toLocal(this.beltStart)
    const b = this.toLocal(this.beltEnd)
    this.origin = a
    this.length = b.sub(a).length
    this.dir = b.sub(a).normalize()
    this.side = this.up.cross(this.dir).normalize()
    const j = this.toLocal(this.jamPoint)
    this.jamS = j.sub(a).dot(this.dir)
    // Parcel's local Z (its length) follows the belt direction.
    this.baseRotation = quat.lookAt(this.dir, this.up)
  }

  private buildParcels(): void {
    const parent = global.scene.createSceneObject("Parcels")
    parent.setParent(this.sceneObject)
    const meshSize = this.boxMesh.aabbMax.sub(this.boxMesh.aabbMin)
    const scale = new vec3(this.parcelSize.z / meshSize.x, this.parcelSize.y / meshSize.y, this.parcelSize.x / meshSize.z)
    for (let i = 0; i < this.poolSize; i++) {
      const so = global.scene.createSceneObject(`Parcel ${i + 1}`)
      so.setParent(parent)
      const rmv = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
      rmv.mesh = this.boxMesh
      rmv.clearMaterials()
      rmv.addMaterial(this.parcelMaterial)
      so.getTransform().setLocalScale(scale)
      so.enabled = false
      this.parcels.push({so, transform: so.getTransform(), s: 0, lane: 0, skew: 0, active: false})
    }
    // Start with parcels already spread along the belt so the scene is never empty.
    for (let s = this.length - this.parcelSize.x; s > this.parcelSize.x; s -= this.flowSpacing) {
      this.spawn(s)
    }
  }

  private spawn(s: number): boolean {
    const p = this.parcels.find((x) => !x.active)
    if (!p) return false
    p.active = true
    p.s = s
    p.lane = (Math.random() - 0.5) * 8
    p.skew = (Math.random() - 0.5) * 4
    p.so.enabled = true
    this.placeParcel(p)
    return true
  }

  private updateParcels(v: number, dt: number): void {
    const pitch = this.parcelSize.x + this.queueGap
    const active = this.parcels.filter((p) => p.active).sort((a, b) => b.s - a.s)

    let aheadS = Number.POSITIVE_INFINITY
    let frontOfJam = true
    for (const p of active) {
      let limit = aheadS - pitch
      const beforeJam = p.s <= this.jamS + 0.01
      if (this.jammed && beforeJam) {
        if (frontOfJam) limit = Math.min(limit, this.jamS)
        frontOfJam = false
      }
      p.s = Math.min(p.s + v * dt, limit)

      // The parcel stuck at the transfer point twists; everything else settles straight.
      const stuck = this.jammed && Math.abs(p.s - this.jamS) < 0.5
      const targetSkew = stuck ? 17 : 0
      p.skew += (targetSkew - p.skew) * Math.min(1, dt * 3)

      aheadS = p.s
      if (p.s > this.length - this.parcelSize.x * 0.5) {
        p.active = false
        p.so.enabled = false
      } else {
        this.placeParcel(p)
      }
    }

    // Feed new parcels at the infeed when there is room.
    this.spawnTimer -= dt
    if (v > 1 && this.spawnTimer <= 0) {
      const last = active.length ? active[active.length - 1].s : Number.POSITIVE_INFINITY
      if (last > pitch + this.parcelSize.x * 0.5 && this.spawn(this.parcelSize.x * 0.5)) {
        this.spawnTimer = this.flowSpacing / v
      }
    }
  }

  private placeParcel(p: Parcel): void {
    const pos = this.origin
      .add(this.dir.uniformScale(p.s))
      .add(this.side.uniformScale(p.lane))
      .add(this.up.uniformScale(this.parcelSize.y / 2))
    p.transform.setLocalPosition(pos)
    const yaw = quat.angleAxis(p.skew * MathUtils.DegToRad, this.up)
    p.transform.setLocalRotation(yaw.multiply(this.baseRotation))
  }

  // ── Highlight ────────────────────────────────────────────────────────────
  private buildHighlight(): void {
    this.highlight = global.scene.createSceneObject("Congestion Highlight")
    this.highlight.setParent(this.sceneObject)
    const t = this.highlight.getTransform()
    t.setLocalPosition(this.toLocal(this.zoneCenter).add(this.up.uniformScale(this.zoneSize.y / 2)))
    t.setLocalRotation(quat.lookAt(this.dir, this.up))
    this.highlightMat = this.highlightMaterial.clone()
    this.highlightMat.mainPass.blendMode = BlendMode.Add
    this.highlightMat.mainPass.depthWrite = false
    this.highlightMat.mainPass.twoSided = true

    // Thin wireframe box (12 edges) around the zone: marks the area without
    // tinting the parcels and rollers inside it.
    const meshSize = this.boxMesh.aabbMax.sub(this.boxMesh.aabbMin)
    const a = this.zoneSize.z / 2   // across the belt (local X)
    const b = this.zoneSize.y / 2   // up (local Y)
    const c = this.zoneSize.x / 2   // along the belt (local Z)
    const w = this.edgeThickness
    const edges: {pos: vec3; size: vec3}[] = []
    for (const sy of [-1, 1]) for (const sz of [-1, 1]) edges.push({pos: new vec3(0, sy * b, sz * c), size: new vec3(2 * a + w, w, w)})
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) edges.push({pos: new vec3(sx * a, 0, sz * c), size: new vec3(w, 2 * b + w, w)})
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) edges.push({pos: new vec3(sx * a, sy * b, 0), size: new vec3(w, w, 2 * c + w)})
    edges.forEach((e, i) => {
      const so = global.scene.createSceneObject(`Edge ${i + 1}`)
      so.setParent(this.highlight)
      so.getTransform().setLocalPosition(e.pos)
      so.getTransform().setLocalScale(new vec3(e.size.x / meshSize.x, e.size.y / meshSize.y, e.size.z / meshSize.z))
      const rmv = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
      rmv.mesh = this.boxMesh
      rmv.clearMaterials()
      rmv.addMaterial(this.highlightMat)
    })
    this.highlight.enabled = false
  }

  private updateHighlight(): void {
    if (this.highlightMode === "off") return
    let c = this.warningColor
    let k = 0
    switch (this.highlightMode) {
      case "warning":
        k = 0.8 + 0.2 * Math.sin(this.time * 4.5)
        break
      case "inspection":
        k = 0.45 + 0.05 * Math.sin(this.time * 2)
        break
      case "resolved": {
        c = this.resolvedColor
        k = Math.max(0, 0.9 * (1 - this.modeTime / 2.5))
        if (k <= 0) {
          this.setHighlight("off")
          return
        }
        break
      }
    }
    this.highlightMat.mainPass.baseColor = new vec4(c.x * k, c.y * k, c.z * k, 1)
  }
}
