import "./style.css";
import { EmulatorSession } from "./core/session";
import { EditorPanel } from "./ui/editorPanel";
import { RegisterPanel } from "./ui/registerPanel";
import { DisassemblyPanel } from "./ui/disassemblyPanel";
import { Controls } from "./ui/controls";
import { DEFAULT_EXAMPLE } from "./examples/default";

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
    </div>
  </div>
`;

const session = new EmulatorSession(DEFAULT_EXAMPLE);

new Controls(document.querySelector("#controls")!, session);
new EditorPanel(document.querySelector("#editor")!, session, DEFAULT_EXAMPLE);
new RegisterPanel(document.querySelector("#registers")!, session);
new DisassemblyPanel(document.querySelector("#disassembly")!, session);
