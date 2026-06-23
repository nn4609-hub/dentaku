import Decimal from "decimal.js";
import {
  backspace,
  chooseOperator,
  clearCalculator,
  evaluateCalculator,
  initialCalculatorState,
  inputDecimalPoint,
  inputDigit,
  operatorLabel,
  setCurrentValue,
  type CalculatorState,
  type Operator
} from "./calculator/calculator";
import { createHistoryItem, loadHistory, saveHistory, type HistoryItem } from "./calculator/history";
import { loadSettings, resetSettings, saveSettings, type Settings } from "./calculator/settings";
import {
  formatDecimal,
  formatFixed,
  formatPlain,
  isValidDecimalInput,
  normalizeNumberInput,
  roundDecimal,
  toDecimal
} from "./calculator/formatting";
import "./styles.css";

type LimitResult = {
  raw: string;
  display: string;
  expression: string;
};

declare global {
  interface Window {
    desktopApi?: {
      isElectron?: boolean;
      setAlwaysOnTop?: (enabled: boolean) => Promise<boolean>;
    };
  }
}

const app = document.querySelector<HTMLDivElement>("#app");

window.addEventListener("error", (event) => {
  showStartupError(event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  showStartupError(event.reason instanceof Error ? event.reason.message : String(event.reason));
});

if (!app) {
  throw new Error("App root was not found.");
}

let settings = loadSettings();
let history = loadHistory();
let calculatorState: CalculatorState = initialCalculatorState;
let salePriceInput = "";
let limitResult: LimitResult | null = null;
let toastTimer: number | null = null;
let isAlwaysOnTop = false;

app.innerHTML = `
  <div class="shell">
    <header class="app-header">
      <div>
        <h1>上限仕入れ額計算機</h1>
        <p>想定売値から仕入れ上限を出し、そのまま再計算できます。</p>
      </div>
      <div class="header-actions">
        <button class="pin-button" id="alwaysOnTopToggle" type="button" aria-pressed="false">最前面</button>
        <button class="icon-button" id="settingsToggle" type="button" aria-label="設定" title="設定">⚙</button>
      </div>
    </header>

    <main class="workspace">
      <section class="main-column" aria-label="計算エリア">
        <section class="panel limit-panel">
          <div class="panel-heading">
            <h2>仕入れ上限</h2>
            <span id="coefficientBadge" class="badge"></span>
          </div>

          <label class="field">
            <span>想定売値</span>
            <div class="input-action">
              <input id="salePrice" inputmode="decimal" autocomplete="off" placeholder="10,000" />
              <button id="clearSalePrice" class="clear-input-button" type="button">クリア</button>
            </div>
          </label>

          <div class="result-box">
            <span>上限仕入れ額</span>
            <strong id="limitValue">-</strong>
          </div>

          <div class="actions-row">
            <button id="copyLimit" type="button">コピー</button>
          </div>

          <p id="limitError" class="error-text" aria-live="polite"></p>
        </section>

        <section class="panel settings-panel is-hidden" id="settingsPanel" aria-label="設定">
          <div class="panel-heading">
            <h2>設定</h2>
            <button id="resetSettings" class="subtle-button" type="button">初期化</button>
          </div>

          <div class="settings-grid">
            <label class="field">
              <span>係数</span>
              <input id="coefficient" inputmode="decimal" autocomplete="off" />
            </label>
            <label class="field">
              <span>小数桁数</span>
              <select id="decimalPlaces">
                <option value="0">0</option>
                <option value="2">2</option>
                <option value="4">4</option>
                <option value="8">8</option>
              </select>
            </label>
            <label class="field">
              <span>丸め方式</span>
              <select id="roundingMode">
                <option value="half-up">四捨五入</option>
                <option value="floor">切り捨て</option>
                <option value="ceil">切り上げ</option>
              </select>
            </label>
          </div>
          <p id="settingsError" class="error-text" aria-live="polite"></p>
        </section>

        <section class="panel calculator-panel">
          <div class="panel-heading">
            <h2>電卓</h2>
            <button id="copyCalc" class="subtle-button" type="button">コピー</button>
          </div>

          <div class="calculator-display" aria-live="polite">
            <small id="calcExpression"></small>
            <strong id="calcDisplay">0</strong>
          </div>
          <div id="calculatorKeypad" class="calculator-keypad" aria-label="電卓キー">
            <button class="calculator-key calculator-key-clear" type="button" data-calculator-action="clear">AC</button>
            <button class="calculator-key calculator-key-utility" type="button" data-calculator-action="backspace" aria-label="1文字削除">⌫</button>
            <button class="calculator-key calculator-key-operator" type="button" data-calculator-action="operator" data-value="/">÷</button>
            <button class="calculator-key calculator-key-operator" type="button" data-calculator-action="operator" data-value="*">×</button>
            <button class="calculator-key" type="button" data-calculator-action="digit" data-value="7">7</button>
            <button class="calculator-key" type="button" data-calculator-action="digit" data-value="8">8</button>
            <button class="calculator-key" type="button" data-calculator-action="digit" data-value="9">9</button>
            <button class="calculator-key calculator-key-operator" type="button" data-calculator-action="operator" data-value="-">−</button>
            <button class="calculator-key" type="button" data-calculator-action="digit" data-value="4">4</button>
            <button class="calculator-key" type="button" data-calculator-action="digit" data-value="5">5</button>
            <button class="calculator-key" type="button" data-calculator-action="digit" data-value="6">6</button>
            <button class="calculator-key calculator-key-operator" type="button" data-calculator-action="operator" data-value="+">+</button>
            <button class="calculator-key" type="button" data-calculator-action="digit" data-value="1">1</button>
            <button class="calculator-key" type="button" data-calculator-action="digit" data-value="2">2</button>
            <button class="calculator-key" type="button" data-calculator-action="digit" data-value="3">3</button>
            <button class="calculator-key calculator-key-equals" type="button" data-calculator-action="evaluate">=</button>
            <button class="calculator-key calculator-key-zero" type="button" data-calculator-action="digit" data-value="0">0</button>
            <button class="calculator-key" type="button" data-calculator-action="decimal">.</button>
          </div>
          <p class="keyboard-hint">画面のキーまたはテンキーで計算できます。Enter で確定、Esc でクリア。</p>
        </section>
      </section>

      <aside class="panel history-panel" aria-label="履歴">
        <div class="panel-heading">
          <h2>履歴</h2>
          <button id="clearHistory" class="subtle-button" type="button">全削除</button>
        </div>
        <div id="historyList" class="history-list"></div>
      </aside>
    </main>
  </div>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
`;
app.dataset.ready = "true";

const elements = {
  alwaysOnTopToggle: getElement<HTMLButtonElement>("alwaysOnTopToggle"),
  settingsToggle: getElement<HTMLButtonElement>("settingsToggle"),
  settingsPanel: getElement<HTMLElement>("settingsPanel"),
  coefficientBadge: getElement<HTMLElement>("coefficientBadge"),
  salePrice: getElement<HTMLInputElement>("salePrice"),
  clearSalePrice: getElement<HTMLButtonElement>("clearSalePrice"),
  limitValue: getElement<HTMLElement>("limitValue"),
  limitError: getElement<HTMLElement>("limitError"),
  copyLimit: getElement<HTMLButtonElement>("copyLimit"),
  coefficient: getElement<HTMLInputElement>("coefficient"),
  decimalPlaces: getElement<HTMLSelectElement>("decimalPlaces"),
  roundingMode: getElement<HTMLSelectElement>("roundingMode"),
  resetSettings: getElement<HTMLButtonElement>("resetSettings"),
  settingsError: getElement<HTMLElement>("settingsError"),
  calcExpression: getElement<HTMLElement>("calcExpression"),
  calcDisplay: getElement<HTMLElement>("calcDisplay"),
  calculatorKeypad: getElement<HTMLElement>("calculatorKeypad"),
  copyCalc: getElement<HTMLButtonElement>("copyCalc"),
  historyList: getElement<HTMLElement>("historyList"),
  clearHistory: getElement<HTMLButtonElement>("clearHistory"),
  toast: getElement<HTMLElement>("toast")
};

bindEvents();
syncSettingsControls();
render();
registerServiceWorker();

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Element #${id} was not found.`);
  }
  return element as T;
}

function bindEvents(): void {
  elements.alwaysOnTopToggle.addEventListener("click", async () => {
    if (!window.desktopApi?.setAlwaysOnTop) {
      showToast("デスクトップ版で利用できます");
      return;
    }

    try {
      isAlwaysOnTop = await window.desktopApi.setAlwaysOnTop(!isAlwaysOnTop);
      showToast(isAlwaysOnTop ? "最前面に固定しました" : "最前面を解除しました");
      render();
    } catch {
      showToast("最前面の切り替えに失敗しました");
    }
  });

  elements.settingsToggle.addEventListener("click", () => {
    elements.settingsPanel.classList.toggle("is-hidden");
  });

  elements.salePrice.addEventListener("input", () => {
    salePriceInput = elements.salePrice.value;
    computeLimit(false);
    render();
  });

  elements.salePrice.addEventListener("change", () => {
    computeLimit(true);
    render();
  });

  elements.salePrice.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      computeLimit(true);
      render();
      elements.salePrice.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      clearSalePrice();
    }
  });

  elements.clearSalePrice.addEventListener("click", () => {
    clearSalePrice();
    elements.salePrice.focus();
  });

  elements.coefficient.addEventListener("input", updateSettingsFromControls);
  elements.decimalPlaces.addEventListener("change", updateSettingsFromControls);
  elements.roundingMode.addEventListener("change", updateSettingsFromControls);

  elements.resetSettings.addEventListener("click", () => {
    settings = resetSettings();
    syncSettingsControls();
    computeLimit(false);
    showToast("設定を初期化しました");
    render();
  });

  elements.copyLimit.addEventListener("click", () => {
    if (limitResult) {
      copyValue(limitResult.raw);
    }
  });

  elements.copyCalc.addEventListener("click", () => {
    if (!calculatorState.error) {
      copyValue(calculatorState.displayValue);
    }
  });

  elements.calculatorKeypad.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const button = target.closest<HTMLButtonElement>("[data-calculator-action]");
    if (!button) {
      return;
    }

    applyCalculatorAction(button.dataset.calculatorAction ?? "", button.dataset.value);
  });

  window.addEventListener("keydown", handleCalculatorKeydown);

  elements.clearHistory.addEventListener("click", () => {
    history = [];
    saveHistory(history);
    renderHistory();
  });

  elements.historyList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const copyButton = target.closest<HTMLButtonElement>("[data-copy-history]");
    if (copyButton) {
      const item = history.find((entry) => entry.id === copyButton.dataset.copyHistory);
      if (item) {
        copyValue(item.result);
      }
      return;
    }

    const deleteButton = target.closest<HTMLButtonElement>("[data-delete-history]");
    if (deleteButton) {
      history = history.filter((entry) => entry.id !== deleteButton.dataset.deleteHistory);
      saveHistory(history);
      renderHistory();
      return;
    }

    const itemButton = target.closest<HTMLButtonElement>("[data-use-history]");
    if (!itemButton) {
      return;
    }

    const item = history.find((entry) => entry.id === itemButton.dataset.useHistory);
    if (item) {
      calculatorState = setCurrentValue(item.result);
      showToast("履歴の結果を電卓へ読み込みました");
      render();
    }
  });
}

function updateSettingsFromControls(): void {
  const nextCoefficient = normalizeNumberInput(elements.coefficient.value);
  elements.settingsError.textContent = "";

  if (!isValidDecimalInput(nextCoefficient) || new Decimal(nextCoefficient).lte(0) || new Decimal(nextCoefficient).gt(9.9999)) {
    elements.settingsError.textContent = "係数は 0 より大きく 9.9999 以下で入力してください。";
    return;
  }

  settings = {
    ...settings,
    coefficient: nextCoefficient,
    decimalPlaces: Number(elements.decimalPlaces.value),
    roundingMode: elements.roundingMode.value as Settings["roundingMode"]
  };
  saveSettings(settings);
  computeLimit(false);
  render();
}

function syncSettingsControls(): void {
  elements.coefficient.value = settings.coefficient;
  elements.decimalPlaces.value = String(settings.decimalPlaces);
  elements.roundingMode.value = settings.roundingMode;
}

function computeLimit(addHistoryItem: boolean): void {
  const normalizedSalePrice = normalizeNumberInput(salePriceInput);
  limitResult = null;
  elements.limitError.textContent = "";

  if (normalizedSalePrice === "") {
    return;
  }

  if (!isValidDecimalInput(normalizedSalePrice)) {
    elements.limitError.textContent = "想定売値は数字で入力してください。";
    return;
  }

  const salePrice = toDecimal(normalizedSalePrice);
  if (salePrice.lt(0)) {
    elements.limitError.textContent = "想定売値にマイナスは使えません。";
    return;
  }

  const coefficient = toDecimal(settings.coefficient);
  const rounded = roundDecimal(salePrice.times(coefficient), settings.decimalPlaces, settings.roundingMode);
  const raw = formatPlain(rounded, settings.decimalPlaces);
  const display = formatFixed(rounded, settings.decimalPlaces);
  const expression = `売値 ${formatDecimal(salePrice)} × ${settings.coefficient} = ${display}`;

  limitResult = { raw, display, expression };

  calculatorState = setCurrentValue(raw);

  if (addHistoryItem) {
    const last = history[0];
    if (last?.expression !== expression) {
      addHistory("limit-price", expression, raw);
    }
  }
}

function addHistory(kind: HistoryItem["kind"], expression: string, result: string): void {
  history = [createHistoryItem(kind, expression, result), ...history].slice(0, settings.maxHistoryItems);
  saveHistory(history);
}

function render(): void {
  elements.alwaysOnTopToggle.classList.toggle("is-active", isAlwaysOnTop);
  elements.alwaysOnTopToggle.setAttribute("aria-pressed", String(isAlwaysOnTop));
  elements.alwaysOnTopToggle.textContent = isAlwaysOnTop ? "最前面中" : "最前面";
  elements.coefficientBadge.textContent = `係数 ${settings.coefficient}`;
  elements.limitValue.textContent = limitResult?.display ?? "-";
  elements.copyLimit.disabled = !limitResult;

  const expression = calculatorState.pendingOperator
    ? `${formatDecimal(calculatorState.storedValue ?? "0")} ${operatorLabel(calculatorState.pendingOperator)}`
    : "";
  elements.calcExpression.textContent = calculatorState.error ?? expression;
  elements.calcDisplay.textContent = calculatorState.error ? "エラー" : formatDecimal(calculatorState.displayValue);

  renderHistory();
}

function handleCalculatorKeydown(event: KeyboardEvent): void {
  const target = event.target;
  const isTypingInField =
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;

  if (isTypingInField && target !== elements.salePrice) {
    return;
  }

  if (/^\d$/.test(event.key)) {
    if (target === elements.salePrice) {
      return;
    }
    event.preventDefault();
    applyCalculatorAction("digit", event.key, false);
  } else if (event.key === "." || event.key === "Decimal") {
    if (target === elements.salePrice) {
      return;
    }
    event.preventDefault();
    applyCalculatorAction("decimal", undefined, false);
  } else if (isOperatorKey(event.key)) {
    event.preventDefault();
    applyCalculatorAction("operator", normalizeOperatorKey(event.key), false);
    if (target instanceof HTMLElement) {
      target.blur();
    }
  } else if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    applyCalculatorAction("evaluate", undefined, false);
    if (target instanceof HTMLElement) {
      target.blur();
    }
  } else if (event.key === "Backspace") {
    if (target === elements.salePrice) {
      return;
    }
    event.preventDefault();
    applyCalculatorAction("backspace", undefined, false);
  } else if (event.key === "Escape") {
    event.preventDefault();
    if (target === elements.salePrice || salePriceInput !== "") {
      clearSalePrice();
    } else {
      applyCalculatorAction("clear", undefined, false);
    }
  } else if (event.key.toLowerCase() === "c") {
    event.preventDefault();
    applyCalculatorAction("clear", undefined, false);
  } else {
    return;
  }

  render();
}

function applyCalculatorAction(action: string, value?: string, shouldRender = true): void {
  switch (action) {
    case "digit":
      if (value) {
        calculatorState = inputDigit(calculatorState, value);
      }
      break;
    case "decimal":
      calculatorState = inputDecimalPoint(calculatorState);
      break;
    case "operator":
      if (value && isOperatorKey(value)) {
        calculatorState = chooseOperator(calculatorState, normalizeOperatorKey(value));
      }
      break;
    case "backspace":
      calculatorState = backspace(calculatorState);
      break;
    case "clear":
      calculatorState = clearCalculator();
      break;
    case "evaluate":
      evaluateAndStore();
      break;
    default:
      return;
  }

  if (shouldRender) {
    render();
  }
}

function clearSalePrice(): void {
  salePriceInput = "";
  elements.salePrice.value = "";
  limitResult = null;
  elements.limitError.textContent = "";
  calculatorState = clearCalculator();
  render();
}

function evaluateAndStore(): void {
  const evaluated = evaluateCalculator(calculatorState);
  calculatorState = evaluated.state;
  if (evaluated.expression && evaluated.result) {
    addHistory("calculator", `${evaluated.expression} = ${formatDecimal(evaluated.result)}`, evaluated.result);
  }
}

function isOperatorKey(key: string): boolean {
  return key === "+" || key === "-" || key === "*" || key === "/" || key === "x" || key === "X";
}

function normalizeOperatorKey(key: string): Operator {
  return key === "x" || key === "X" ? "*" : (key as Operator);
}

function renderHistory(): void {
  elements.historyList.innerHTML =
    history.length === 0
      ? `<p class="empty-history">履歴はまだありません。</p>`
      : history
          .map(
            (item) => `
              <article class="history-item">
                <button type="button" class="history-main" data-use-history="${item.id}">
                  <span>${item.expression}</span>
                  <strong>${formatDecimal(item.result)}</strong>
                </button>
                <button type="button" class="history-copy" data-copy-history="${item.id}" aria-label="履歴結果をコピー" title="コピー">⧉</button>
                <button type="button" class="history-delete" data-delete-history="${item.id}" aria-label="履歴を削除" title="削除">×</button>
              </article>
            `
          )
          .join("");
}

async function copyValue(value: string): Promise<void> {
  const plain = formatPlain(value);

  try {
    await navigator.clipboard.writeText(plain);
    showToast("コピーしました");
  } catch {
    window.prompt("コピーする数値", plain);
  }
}

function showToast(message: string): void {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");

  if (toastTimer) {
    window.clearTimeout(toastTimer);
  }

  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 1600);
}

function registerServiceWorker(): void {
  if (window.desktopApi?.isElectron) {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
    }
    return;
  }

  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {
        // The app remains fully usable without offline caching.
      });
    });
    return;
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
    });
  }
}

function showStartupError(message: string): void {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root || root.dataset.ready === "true") {
    return;
  }

  root.innerHTML = `
    <div style="max-width: 720px; margin: 40px auto; padding: 20px; font-family: sans-serif; color: #17231f;">
      <h1 style="font-size: 20px;">アプリの読み込みに失敗しました</h1>
      <p>ローカルサーバー経由で開いてください。</p>
      <code style="display: block; padding: 12px; background: #f2f5f4; white-space: pre-wrap;">${escapeHtml(message)}</code>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return entities[character];
  });
}
