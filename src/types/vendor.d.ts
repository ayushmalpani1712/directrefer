declare module 'html2canvas' {
  interface Html2CanvasOptions {
    backgroundColor?: string
    scale?: number
  }
  function html2canvas(el: HTMLElement, options?: Html2CanvasOptions): Promise<HTMLCanvasElement>
  export default html2canvas
}

declare module 'jspdf' {
  class jsPDF {
    constructor(orientation?: string, unit?: string, format?: string)
    internal: { pageSize: { getWidth(): number; getHeight(): number } }
    addImage(imgData: string, format: string, x: number, y: number, width: number, height: number): void
    save(filename: string): void
  }
  export default jsPDF
}
