import "./style.css";
import { EmulatorSession } from "./core/session";
import { EditorPanel } from "./ui/editorPanel";
import { RegisterPanel } from "./ui/registerPanel";
import { DisassemblyPanel } from "./ui/disassemblyPanel";
import { MemoryPanel } from "./ui/memoryPanel";
import { Controls } from "./ui/controls";
import { DEFAULT_EXAMPLE } from "./examples/default";
import { readSourceFromLocation } from "./core/shareLink";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <div class="app-layout">
    <div class="left-pane">
      <div id="controls"></div>
      <div id="editor"></div>
    </div>
    <div class="right-pane">
      <div id="registers" class="panel"></div>
      <div id="disassembly" class="panel"></div>
      <div id="memory" class="panel"></div>
    </div>
  </div>
`;

const initialSource = readSourceFromLocation() ?? DEFAULT_EXAMPLE;

const session = new EmulatorSession(initialSource);

new Controls(document.querySelector("#controls")!, session);
new EditorPanel(document.querySelector("#editor")!, session, initialSource);
new RegisterPanel(document.querySelector("#registers")!, session);
new DisassemblyPanel(document.querySelector("#disassembly")!, session);
new MemoryPanel(document.querySelector("#memory")!, session);
