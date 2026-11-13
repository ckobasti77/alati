"use client";

import { Component, type ReactNode } from "react";

export type ErrorBoundaryFallbackProps = { error: Error; reset: () => void };

type Props = {
  children: ReactNode;
  fallback: (props: ErrorBoundaryFallbackProps) => ReactNode;
  /** Promena bilo kog ključa (npr. filteri) briše grešku i ponovo crta decu. */
  resetKeys?: readonly unknown[];
};

type State = { error: Error | null; attempt: number; keys: readonly unknown[] | undefined };

const sameKeys = (a: readonly unknown[] | undefined, b: readonly unknown[] | undefined) =>
  a === b || (!!a && !!b && a.length === b.length && a.every((value, index) => Object.is(value, b[index])));

/**
 * Greška u delu stranice (npr. Convex query koji baca) prikazuje `fallback` umesto da obori celu aplikaciju.
 * `reset` remount-uje decu (nova pretplata na query).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, attempt: 0, keys: this.props.resetKeys };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (sameKeys(props.resetKeys, state.keys)) return null;
    return { keys: props.resetKeys, error: null, attempt: state.attempt + 1 };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  reset = () => this.setState((state) => ({ error: null, attempt: state.attempt + 1 }));

  render() {
    if (this.state.error) return this.props.fallback({ error: this.state.error, reset: this.reset });
    // `contents`: omotač postoji samo zbog key-a (ponovni pokušaj remount-uje decu), ne utiče na layout.
    return (
      <div key={this.state.attempt} className="contents">
        {this.props.children}
      </div>
    );
  }
}
