export interface VirtualItem {
  index: number
  start: number
  size: number
  end: number
}

export interface VirtualizerOptions {
  count: number
  getScrollElement: () => HTMLElement | null
  estimateSize: (index: number) => number
  overscan?: number
  onChange?: (virtualizer: Virtualizer) => void
}

export class Virtualizer {
  private options: VirtualizerOptions
  private scrollTop = 0
  private clientHeight = 0
  private scrollElement: HTMLElement | null = null
  private cleanupListener: (() => void) | null = null
  private pollInterval: any = null
  private pollTimeout: any = null
  private cachedOffsets: Array<number> | null = null
  private cachedTotalSize: number | null = null

  constructor(options: VirtualizerOptions) {
    this.options = { overscan: 5, ...options }
    this.init()
  }

  private init() {
    const bindScroll = () => {
      const el = this.options.getScrollElement()
      if (!el) return false
      this.scrollElement = el
      this.scrollTop = el.scrollTop
      this.clientHeight = el.clientHeight

      const handleScroll = () => {
        if (!this.scrollElement) return
        const currentScrollTop = this.scrollElement.scrollTop
        const currentClientHeight = this.scrollElement.clientHeight
        if (
          currentScrollTop !== this.scrollTop ||
          currentClientHeight !== this.clientHeight
        ) {
          this.scrollTop = currentScrollTop
          this.clientHeight = currentClientHeight
          if (this.options.onChange) {
            this.options.onChange(this)
          }
        }
      }

      el.addEventListener('scroll', handleScroll, { passive: true })

      const ro = new ResizeObserver(() => {
        handleScroll()
      })
      ro.observe(el)

      this.cleanupListener = () => {
        el.removeEventListener('scroll', handleScroll)
        ro.disconnect()
      }

      if (this.pollInterval) {
        clearInterval(this.pollInterval)
        this.pollInterval = null
      }
      if (this.pollTimeout) {
        clearTimeout(this.pollTimeout)
        this.pollTimeout = null
      }

      return true
    }

    if (!bindScroll()) {
      this.pollInterval = setInterval(() => {
        if (bindScroll()) {
          // Already cleared in bindScroll
        }
      }, 50)

      this.pollTimeout = setTimeout(() => {
        if (this.pollInterval) {
          clearInterval(this.pollInterval)
          this.pollInterval = null
        }
        this.pollTimeout = null
      }, 5000)
    }
  }

  public updateOptions(newOptions: Partial<VirtualizerOptions>) {
    const countChanged = newOptions.count !== undefined && newOptions.count !== this.options.count
    const estimateSizeChanged = newOptions.estimateSize !== undefined && newOptions.estimateSize !== this.options.estimateSize
    
    if (countChanged || estimateSizeChanged) {
      this.cachedOffsets = null
      this.cachedTotalSize = null
    }

    this.options = { ...this.options, ...newOptions }
    const el = this.options.getScrollElement()
    if (el && el !== this.scrollElement) {
      this.destroy()
      this.init()
    }
  }

  public destroy() {
    if (this.cleanupListener) {
      this.cleanupListener()
      this.cleanupListener = null
    }
    this.scrollElement = null
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout)
      this.pollTimeout = null
    }
  }

  private getOffsets(): Array<number> {
    if (this.cachedOffsets !== null) {
      return this.cachedOffsets
    }
    const offsets: Array<number> = []
    let currentOffset = 0
    for (let i = 0; i < this.options.count; i++) {
      offsets.push(currentOffset)
      currentOffset += this.options.estimateSize(i)
    }
    this.cachedOffsets = offsets
    this.cachedTotalSize = currentOffset
    return offsets
  }

  public getTotalSize(): number {
    if (this.cachedTotalSize !== null) {
      return this.cachedTotalSize
    }
    this.getOffsets()
    return this.cachedTotalSize ?? 0
  }

  public getVirtualItems(): Array<VirtualItem> {
    const count = this.options.count
    if (count === 0) return []

    const overscan = this.options.overscan ?? 5
    const offsets = this.getOffsets()

    let startIndex = 0
    let endIndex = 0

    let low = 0
    let high = count - 1
    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const start = offsets[mid]!
      const end = mid < count - 1 ? offsets[mid + 1]! : this.getTotalSize()

      if (start <= this.scrollTop && end >= this.scrollTop) {
        startIndex = mid
        break
      } else if (start > this.scrollTop) {
        high = mid - 1
      } else {
        low = mid + 1
      }
    }
    if (low > high) {
      startIndex = Math.max(0, Math.min(count - 1, low))
    }

    const viewBottom = this.scrollTop + this.clientHeight
    low = startIndex
    high = count - 1
    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      const start = offsets[mid]!
      const end = mid < count - 1 ? offsets[mid + 1]! : this.getTotalSize()

      if (start <= viewBottom && end >= viewBottom) {
        endIndex = mid
        break
      } else if (start > viewBottom) {
        high = mid - 1
      } else {
        low = mid + 1
      }
    }
    if (low > high) {
      endIndex = Math.max(startIndex, Math.min(count - 1, high))
    }

    const activeStart = Math.max(0, startIndex - overscan)
    const activeEnd = Math.min(count - 1, endIndex + overscan)

    const items: Array<VirtualItem> = []
    for (let i = activeStart; i <= activeEnd; i++) {
      const start = offsets[i]!
      const end = i < count - 1 ? offsets[i + 1]! : this.getTotalSize()
      items.push({
        index: i,
        start,
        size: end - start,
        end,
      })
    }

    return items
  }
}
