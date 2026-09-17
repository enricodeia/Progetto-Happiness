import { Vector3 } from 'three'

/**
 * The lobe cards.
 *
 * A card is a squircle holding one ingredient: a title, its numbers, and a
 * description that opens on hover. Nothing above the title — the numbers are
 * the point, so they sit directly under it in the open rather than as a
 * footnote, and the description is the supporting text behind them.
 *
 * A card arrives when the front passes ITS OWN vertex, not on a timer: the beat
 * you see and the number that drives it are the same, so retuning the reveal
 * can never desynchronise them, and moving a card to another lobe moves its
 * beat with it.
 *
 * Placement is derived, never guessed. The anchor is projected to screen space
 * each frame and the card is pushed outward past the mark's own projected
 * silhouette box; a fixed pixel offset from the vertex lands on top of the band
 * wherever the path curves back over itself. The card box moves to whichever
 * side it belongs on — but the text inside is always left-aligned, on both.
 */
const wrap01 = (v) => ((v % 1) + 1) % 1

/** Cheap signature of a card's content, so the DOM is only rebuilt on an edit. */
const contentKey = (item) =>
  [
    item.title,
    item.body,
    item.color,
    ...item.stats.flatMap((s) => [s.value, s.label]),
  ].join(' ')

export function createCards(host, state, app) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('class', 'was-atl-lines')
  host.appendChild(svg)

  const nodes = state.cards.items.map((_, i) => {
    const marker = document.createElement('span')
    marker.className = 'was-atl-marker'
    host.appendChild(marker)

    const el = document.createElement('article')
    el.className = 'was-atl-card'
    el.innerHTML =
      '<h3 class="was-atl-title"></h3>' +
      '<dl class="was-atl-stats"></dl>' +
      '<div class="was-atl-more"><p class="was-atl-body"></p></div>'
    host.appendChild(el)

    // Hover is the card's own business; the mark just reads `hoverIndex`.
    el.addEventListener('pointerenter', () => {
      app.knot.hoverIndex = i
    })
    el.addEventListener('pointerleave', () => {
      if (app.knot.hoverIndex === i) app.knot.hoverIndex = -1
    })

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    svg.appendChild(line)
    return {
      el,
      marker,
      line,
      key: null,
      more: el.querySelector('.was-atl-more'),
      title: el.querySelector('.was-atl-title'),
      body: el.querySelector('.was-atl-body'),
      stats: el.querySelector('.was-atl-stats'),
    }
  })

  /** Rebuild one card's text and number grid. Only runs when the copy changes. */
  function fill(node, item) {
    const key = contentKey(item)
    if (node.key === key) return
    node.key = key
    node.el.style.setProperty('--accent', item.color)
    node.marker.style.setProperty('--accent', item.color)
    node.title.textContent = item.title
    node.body.textContent = item.body
    // An empty value is an empty slot, so a card with one number and a card
    // with three are the same shape of data and neither needs a special case.
    node.stats.replaceChildren(
      ...item.stats
        .filter((s) => s.value)
        .map((s) => {
          const cell = document.createElement('div')
          const dt = document.createElement('dt')
          dt.textContent = s.value
          const dd = document.createElement('dd')
          dd.textContent = s.label
          cell.append(dt, dd)
          return cell
        }),
    )
  }

  const anchor = new Vector3()

  return function syncCards() {
    const cfg = state.cards
    const front = app.knot.reveal?.front ?? 3
    const { w, h } = app.size
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    host.style.display = cfg.enabled ? 'block' : 'none'
    if (!cfg.enabled) return

    const hole = app.holeScreenPosition()
    const box = app.markScreenBox()

    cfg.items.forEach((item, i) => {
      const node = nodes[i]
      fill(node, item)
      node.el.style.setProperty('--card-w', `${cfg.maxWidth}px`)
      node.marker.style.width = `${cfg.marker}px`
      node.marker.style.height = `${cfg.marker}px`

      app.knot.pointAt(item.t, anchor)
      anchor.project(app.camera)
      const ax = ((anchor.x + 1) / 2) * w
      const ay = ((1 - anchor.y) / 2) * h

      // Push away from the centre of the mark, then keep the whole box on
      // screen. Clamping the anchor instead of the box is what lets a card run
      // off the edge while its leader line still looks correct.
      let dx = ax - hole.x
      let dy = ay - hole.y
      const len = Math.hypot(dx, dy) || 1
      dx /= len
      dy /= len
      // A vertex almost directly above or below the centre has its side decided
      // by a couple of pixels, and the pointer lean alone is enough to flip it —
      // which would throw the card a full width across the screen. Once a side
      // is chosen it is kept until the direction is decisively the other way.
      if (node.side === undefined || Math.abs(dx) > 0.12) node.side = dx < 0 ? -1 : 1
      const toLeft = node.side < 0
      const exitX = dx > 0 ? (box.right - hole.x) / dx : (box.left - hole.x) / dx
      const exitY = dy > 0 ? (box.bottom - hole.y) / dy : (box.top - hole.y) / dy
      const exit = Math.min(Math.abs(exitX), Math.abs(exitY))
      const reach = Math.max(exit + cfg.distance, Math.hypot(ax - hole.x, ay - hole.y) + 24)
      const cx = hole.x + dx * reach
      const cy = hole.y + dy * reach

      // The card is laid out at the height it has with the description OPEN,
      // always — even while it is closed.
      //
      // Using the height it happens to have this frame is what made the bottom
      // card crawl sideways as it opened: every frame of the transition was a
      // different height, so every frame got a different vertical clamp and a
      // different marker-clearance push, and the box chased its own growth.
      // Reserving the open height makes placement a constant, and opening only
      // fills space the card already had. The width never enters into it: it is
      // fixed in CSS and the description reflows inside it.
      const cw = node.el.offsetWidth || cfg.maxWidth
      const live = node.el.offsetHeight || 120
      const ch = live - node.more.offsetHeight + node.body.scrollHeight
      const pad = 16
      const top = cfg.padTop ?? pad
      const fitX = (v) => Math.min(Math.max(v, pad), Math.max(pad, w - pad - cw))
      const fitY = (v) => Math.min(Math.max(v, top), Math.max(top, h - pad - ch))
      const baseX = fitX(toLeft ? cx - cw : cx)
      const baseY = fitY(cy - ch / 2)

      // The card must never sit on its own marker, and clamping happens after
      // the push, so a push into a wall is simply undone: at the bottom of a
      // short viewport there is no room below the vertex for an open card, and
      // the vertical escape lands straight back on top of it. So both escapes
      // are tried, cheapest first, and the first one that actually clears wins.
      const clear = cfg.marker / 2 + 14
      const hits = (px, py) =>
        px - clear < ax && ax < px + cw + clear && py - clear < ay && ay < py + ch + clear

      let x = baseX
      let y = baseY
      if (hits(x, y)) {
        const byX = { x: fitX(dx >= 0 ? ax + clear : ax - clear - cw), y: baseY }
        const byY = { x: baseX, y: fitY(dy >= 0 ? ay + clear : ay - clear - ch) }
        const order =
          Math.abs(byX.x - baseX) <= Math.abs(byY.y - baseY) ? [byX, byY] : [byY, byX]
        const escape = order.find((c) => !hits(c.x, c.y)) ?? order[0]
        x = escape.x
        y = escape.y
      }

      node.el.style.left = `${x}px`
      node.el.style.top = `${y}px`
      node.marker.style.left = `${ax - cfg.marker / 2}px`
      node.marker.style.top = `${ay - cfg.marker / 2}px`

      // Revealed exactly when the front passes this vertex, and softly: it
      // rises and resolves out of a blur rather than switching on.
      const d = wrap01(item.t - state.reveal.anchor)
      const t = Math.min(Math.max((front - d) / Math.max(cfg.fade, 1e-4), 0), 1)
      const eased = 1 - (1 - t) ** 3
      node.el.style.opacity = String(eased)
      node.marker.style.opacity = String(eased)
      node.el.style.setProperty('--rise', `${(1 - eased) * 16}px`)
      node.el.style.setProperty('--soft', `${(1 - eased) * 5}px`)
      node.marker.style.setProperty('--pop', String(0.6 + 0.4 * eased))
      // A card you cannot see is not a card you can hover.
      node.el.style.pointerEvents = eased > 0.6 ? 'auto' : 'none'
      if (eased <= 0.6 && app.knot.hoverIndex === i) app.knot.hoverIndex = -1

      // The line runs to the card's own edge, wherever clamping put it, and
      // meets it at the marker's own height where the card is tall enough to
      // allow it: aiming at the middle of an opened card sends the leader
      // diving past the text for no reason. Measured on the card you can see,
      // not on the reserved box, so the line tracks the open edge.
      const edgeX = toLeft ? x + cw : x
      const edgeY = Math.min(Math.max(ay, y + 20), Math.max(y + 20, y + live - 20))
      const gap = cfg.marker * 0.75
      node.line.setAttribute('x1', String(ax + dx * gap))
      node.line.setAttribute('y1', String(ay + dy * gap))
      node.line.setAttribute('x2', String(edgeX))
      node.line.setAttribute('y2', String(edgeY))
      // The marker sits before its own card in the DOM, so no sibling selector
      // can reach it: the hover state is pushed from here instead.
      const hot = app.knot.hoverIndex === i
      node.marker.classList.toggle('hot', hot)
      node.line.style.stroke = hot ? item.color : ''
      node.line.style.opacity = String(eased * 0.5)
    })
  }
}
