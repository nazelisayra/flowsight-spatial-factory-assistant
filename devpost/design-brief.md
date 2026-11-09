---
status: approved
---

# Design brief: FlowSight — Spatial Intelligence for Factory Technicians

<!--
How this brief was made: it follows the plan-lens template from the Devpost Learn
skill pack (challengepost/learn-specs). It was written on 2026-11-08 from the
creator's own written brief and design notes during the build conversation with
Claude Code, not from a plan-lens interview. Values the creator didn't choose are
marked (default). Sizes and positions are taken from the built Lens Studio scene.
-->

## The one spatial moment
A technician walks up to a parcel conveyor, "like an FPS camera view from the technician's view". A small status card shows the transfer station is running normally. When congestion builds, an amber alert appears right above the stuck parcel at the transfer zone. The technician starts an inspection, and a step card plus a blue marker on the machine guide them through three checks until flow is restored.

## Why it belongs on glasses
- Uses: draws in the world, leaves your body free.
- Why it's better than the phone or laptop version: factory dashboards are disconnected from the machine. The technician reads a number on a screen across the room, then has to find the matching part on the line. FlowSight puts the status, the alert and each inspection step on the exact part of the machine they're about, so the technician's eyes stay on the rollers and their hands stay free to check them.

## Product or overlay
- Type: overlay. It responds to a real machine.
- What the real version would sense: live telemetry from the conveyor (belt speed, queue length, flow rate) and a congestion event at the transfer zone.
- Stand-in for the preview:
  - The machine is a 3D model, the NVIDIA SimReady `conveyor_belt_a61` transfer station, at real-world scale.
  - All telemetry is simulated.
  - Congestion is triggered by a "Simulate congestion" button. Parcels then visibly queue and the front parcel skews at the transfer point.
  - Every card says "simulated" and "no equipment control", so nobody mistakes it for a live system.

## Where things live
- Where the user is looking during the main task: the transfer point, where the infeed rollers meet the transfer belt, about 2–2.5 m ahead and below eye level.
- Conveyor station: placed in the room about 2.5 m ahead. The belt sits at about 78 cm, the height of a real belt. On start it begins 220 cm further away and moves in over 4.5 s (a walk-up intro).
- Status card ("Transfer 02"): left of the machine, at about eye level, about 1.3 m away and about 24 cm wide. In Inspection it shrinks to a small pill so it doesn't compete with the step card.
- Congestion alert: floats just above the stuck parcel, about 2 m away and about 30 cm wide. It never covers the rollers or the parcels. An amber leader line and a pulsing marker tie it to the exact spot. It always turns to face the viewer.
- Inspection step card: in the same spot as the status card, left of the machine, about 1.3 m away and about 25 cm wide.
- Spatial callouts: one marker for each check, sitting directly on the machine:
  - Check 1: the transfer rollers.
  - Check 2: the sensor camera on the upper-left post of the scanning cage.
  - Check 3: the transfer belt path.
  - Each marker has a vertical leader line and a small label that faces the viewer.
- Zone highlight: a thin amber wireframe box around the congestion zone (blue during Inspection). The parcels and rollers keep their real colours.
- All UI stays on the left, clear of the machine's own built-in monitor (HMI) on the right.

## Hands and input
- Simulate congestion: pinch the button under the status card (Running state).
- Start inspection: pinch the button on the alert card. This is the only primary action in Warning.
- Mark as checked / Back: pinch the buttons on the step card. After the last check, the main button reads "Complete inspection".
- Reset demo: pinch the button under the status card (Resolved state).
- Targets are big and highlight when aimed at. They use UI Kit buttons with the SnapOS2 Primary and Secondary styles.
- A 1 s cooldown between actions stops a quick double pinch from skipping a state. This matters because "Reset demo" and "Simulate congestion" sit in the same spot. (default)
- Voice: none.

## When things show
- Status card: always visible. It shows a full card in Running, Warning and Resolved, and a small pill in Inspection.
- Congestion alert, leader and marker: show only in Warning and hide when the inspection starts.
- Step card: shows only in Inspection.
- Callout markers: show only in Inspection. Only the current check is large and blue. Done checks turn green and pending ones stay smaller but readable.
- Wireframe highlight: amber pulsing in Warning, steady blue in Inspection, and a short green flash once flow is restored. Off in Running.
- Resolved: the card says "Recovering to baseline · simulated" while values ramp back. It switches to "Flow restored · simulated" only when the metrics are back at exactly 42 units/min, 3 items and 1.2 m/s.
- If something needs attention out of view: none. The alert is placed inside the narrow view, next to the machine.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. On start, the conveyor moves in towards the viewer, then the status card appears. It shows Transfer 02 · Running · 42 units/min · 3 items in queue · belt 1.2 m/s, labelled as simulated telemetry.
2. Pinching "Simulate congestion" enters Warning:
   - Speed drops and the queue rises.
   - Parcels back up at the transfer point.
   - The amber wireframe appears.
   - The "Congestion detected" alert appears above the stuck parcel, with one "Start inspection" button.
3. Pinching "Start inspection" enters Inspection:
   - The status card becomes a small pill.
   - The step card shows "Step 1 of 3 · Check transfer rollers", with the rollers' marker large and blue.
   - "Mark as checked" moves on to Check sensor alignment (2 of 3), then Confirm path is clear (3 of 3).
   - "Back" un-marks the last check.
4. Pinching "Complete inspection" enters Resolved. "Recovering to baseline · simulated" changes to "Flow restored · simulated" at exactly 42 / 3 / 1.2, with a green flash.
5. Pinching "Reset demo" returns to Running. A quick double pinch does not skip a state.
6. From a side view, the callout labels stay readable and attached to their markers. No card covers the rollers, the parcels or the machine's own monitor.

## Out of scope
- Real sensors, real telemetry, or any control of real equipment.
- Object recognition of a real conveyor.
- Complex physics. Parcels are animated, not simulated.
- Multiple stations, multiple users, or saving inspection history.

## Risks and open questions
- Not tried on real SPECS glasses. The Lens Studio developer sign-in was not available ("Sign-ups aren't open yet"), so the Lens couldn't be sent to a device. Comfort, text size at 2 m and real pinch accuracy are unproven.
- Pending callout labels are drawn at 72% size. They may be small to read at distance on glasses.
- The conveyor model is still 168K triangles after simplification. Its frame rate on the glasses is unknown.
- Done criteria were checked in the preview by scripted pinches and screenshots, not by LEAF tests. LEAF scenarios have not been written yet.
- The 1 s double-pinch guard was checked once. The preview drops some fast presses, so it is not fully proven.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
