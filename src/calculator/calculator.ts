import Decimal from "decimal.js";
import { formatPlain, toDecimal } from "./formatting";

export type Operator = "+" | "-" | "*" | "/";

export type CalculatorState = {
  displayValue: string;
  storedValue: string | null;
  pendingOperator: Operator | null;
  waitingForNextInput: boolean;
  expressionLeft: string | null;
  error: string | null;
};

export const initialCalculatorState: CalculatorState = {
  displayValue: "0",
  storedValue: null,
  pendingOperator: null,
  waitingForNextInput: false,
  expressionLeft: null,
  error: null
};

export function inputDigit(state: CalculatorState, digit: string): CalculatorState {
  if (state.error || state.waitingForNextInput) {
    return { ...state, displayValue: digit, waitingForNextInput: false, error: null };
  }

  return {
    ...state,
    displayValue: state.displayValue === "0" ? digit : `${state.displayValue}${digit}`
  };
}

export function inputDecimalPoint(state: CalculatorState): CalculatorState {
  if (state.error || state.waitingForNextInput) {
    return { ...state, displayValue: "0.", waitingForNextInput: false, error: null };
  }

  if (state.displayValue.includes(".")) {
    return state;
  }

  return { ...state, displayValue: `${state.displayValue}.` };
}

export function backspace(state: CalculatorState): CalculatorState {
  if (state.error || state.waitingForNextInput || state.displayValue.length <= 1) {
    return { ...state, displayValue: "0", error: null, waitingForNextInput: false };
  }

  return { ...state, displayValue: state.displayValue.slice(0, -1) };
}

export function clearCalculator(): CalculatorState {
  return initialCalculatorState;
}

export function setCurrentValue(value: string): CalculatorState {
  return {
    ...initialCalculatorState,
    displayValue: formatPlain(value)
  };
}

export function chooseOperator(state: CalculatorState, operator: Operator): CalculatorState {
  if (state.error) {
    return state;
  }

  if (state.pendingOperator && !state.waitingForNextInput && state.storedValue !== null) {
    const calculated = calculate(state.storedValue, state.displayValue, state.pendingOperator);
    if (calculated.error || calculated.value === null) {
      return { ...state, displayValue: "エラー", error: calculated.error };
    }
    const result = formatPlain(calculated.value);
    return {
      displayValue: result,
      storedValue: result,
      pendingOperator: operator,
      waitingForNextInput: true,
      expressionLeft: result,
      error: null
    };
  }

  return {
    ...state,
    storedValue: state.displayValue,
    pendingOperator: operator,
    waitingForNextInput: true,
    expressionLeft: state.displayValue
  };
}

export function evaluateCalculator(state: CalculatorState): {
  state: CalculatorState;
  expression: string | null;
  result: string | null;
} {
  if (!state.pendingOperator || state.storedValue === null || state.error) {
    return { state, expression: null, result: null };
  }

  const rightValue = state.displayValue;
  const calculated = calculate(state.storedValue, rightValue, state.pendingOperator);
  if (calculated.error || calculated.value === null) {
    return {
      state: { ...state, displayValue: "エラー", error: calculated.error, waitingForNextInput: true },
      expression: null,
      result: null
    };
  }

  const result = formatPlain(calculated.value);
  const expression = `${formatPlain(state.storedValue)} ${operatorLabel(state.pendingOperator)} ${formatPlain(rightValue)}`;
  return {
    state: {
      displayValue: result,
      storedValue: null,
      pendingOperator: null,
      waitingForNextInput: true,
      expressionLeft: null,
      error: null
    },
    expression,
    result
  };
}

export function operatorLabel(operator: Operator): string {
  const labels: Record<Operator, string> = {
    "+": "+",
    "-": "-",
    "*": "×",
    "/": "÷"
  };
  return labels[operator];
}

function calculate(left: string, right: string, operator: Operator): { value: Decimal; error: null } | { value: null; error: string } {
  const a = toDecimal(left);
  const b = toDecimal(right);

  if (operator === "/" && b.isZero()) {
    return { value: null, error: "0で割ることはできません" };
  }

  switch (operator) {
    case "+":
      return { value: a.plus(b), error: null };
    case "-":
      return { value: a.minus(b), error: null };
    case "*":
      return { value: a.times(b), error: null };
    case "/":
      return { value: a.dividedBy(b), error: null };
  }
}
