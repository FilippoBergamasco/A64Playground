import { formatValue, type DataFormat } from "./formatting";

export type DataWidth = 1 | 2 | 4 | 8;

const FORMAT_ORDER: DataFormat[] = ["hex", "udec", "sdec"];

export class DataViewer {
  readonly element: HTMLElement;
  private format: DataFormat = "hex";
  private value = 0n;

  constructor(private width: DataWidth) {
    this.element = document.createElement("span");
    this.element.classList.add("data-viewer", `data-viewer-w${width}`);
    this.element.title = "Click to cycle hex / decimal / signed decimal";
    this.element.addEventListener("click", () => this.cycleFormat());
    this.applyFormatClass();
  }

  update(value: bigint, changed: boolean): void {
    this.value = value;
    this.element.classList.toggle("changed", changed);
    this.renderText();
  }

  private cycleFormat(): void {
    const next = FORMAT_ORDER[(FORMAT_ORDER.indexOf(this.format) + 1) % FORMAT_ORDER.length];
    this.format = next;
    this.applyFormatClass();
    this.renderText();
  }

  private applyFormatClass(): void {
    for (const f of FORMAT_ORDER) this.element.classList.remove(`data-viewer-${f}`);
    this.element.classList.add(`data-viewer-${this.format}`);
  }

  private renderText(): void {
    const bitWidth = (this.width * 8) as 8 | 16 | 32 | 64;
    this.element.textContent = formatValue(this.value, bitWidth, this.format);
  }
}
