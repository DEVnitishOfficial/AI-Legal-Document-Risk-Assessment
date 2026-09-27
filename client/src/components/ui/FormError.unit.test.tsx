import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FormError from "./FormError";

describe("<FormError />", () => {
  it("renders nothing when there is no message", () => {
    const { container } = render(<FormError message={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the message with an alert role so screen readers announce it", () => {
    render(<FormError message="Pasted text is too short." />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Pasted text is too short.");
  });

  it("switches from empty to showing a message when the prop changes", () => {
    const { rerender } = render(<FormError message={null} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    rerender(<FormError message="Now there is an error." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Now there is an error.");
  });

  it("clears again when the message goes back to null", () => {
    const { rerender } = render(<FormError message="An error." />);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(<FormError message={null} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
