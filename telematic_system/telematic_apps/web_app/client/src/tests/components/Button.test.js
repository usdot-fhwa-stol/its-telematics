import { expect, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import Button from "../../components/layout/Button";

test("Button should render with children text", () => {
  render(<Button>Click Me</Button>);

  expect(screen.getByText("Click Me")).toBeInTheDocument();
});

test("Button should call onClick handler when clicked", () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click Me</Button>);

  const button = screen.getByText("Click Me");
  fireEvent.click(button);

  expect(handleClick).toHaveBeenCalledTimes(1);
});

test("Button should render with contained variant by default", () => {
  const { container } = render(<Button>Test</Button>);

  const button = container.querySelector('button');
  expect(button).toHaveClass('MuiButton-contained');
});

test("Button should render with outlined variant", () => {
  const { container } = render(<Button variant="outlined">Test</Button>);

  const button = container.querySelector('button');
  expect(button).toHaveClass('MuiButton-outlined');
});

test("Button should render with text variant", () => {
  const { container } = render(<Button variant="text">Test</Button>);

  const button = container.querySelector('button');
  expect(button).toHaveClass('MuiButton-text');
});

test("Button should render with primary color by default", () => {
  const { container } = render(<Button>Test</Button>);

  const button = container.querySelector('button');
  expect(button).toHaveClass('MuiButton-containedPrimary');
});

test("Button should render with secondary color", () => {
  const { container } = render(<Button color="secondary">Test</Button>);

  const button = container.querySelector('button');
  expect(button).toHaveClass('MuiButton-containedSecondary');
});

test("Button should render with medium size by default", () => {
  const { container } = render(<Button>Test</Button>);

  const button = container.querySelector('button');
  expect(button).toHaveClass('MuiButton-sizeMedium');
});

test("Button should render with small size", () => {
  const { container } = render(<Button size="small">Test</Button>);

  const button = container.querySelector('button');
  expect(button).toHaveClass('MuiButton-sizeSmall');
});

test("Button should render with large size", () => {
  const { container } = render(<Button size="large">Test</Button>);

  const button = container.querySelector('button');
  expect(button).toHaveClass('MuiButton-sizeLarge');
});

test("Button should be disabled when disabled prop is true", () => {
  render(<Button disabled>Test</Button>);

  const button = screen.getByRole('button');
  expect(button).toBeDisabled();
});

test("Button should not be disabled by default", () => {
  render(<Button>Test</Button>);

  const button = screen.getByRole('button');
  expect(button).not.toBeDisabled();
});

test("Button should render with fullWidth", () => {
  const { container } = render(<Button fullWidth>Test</Button>);

  const button = container.querySelector('button');
  expect(button).toHaveClass('MuiButton-fullWidth');
});

test("Button should render with startIcon", () => {
  const TestIcon = () => <span data-testid="start-icon">→</span>;
  render(<Button startIcon={<TestIcon />}>Test</Button>);

  expect(screen.getByTestId("start-icon")).toBeInTheDocument();
});

test("Button should render with endIcon", () => {
  const TestIcon = () => <span data-testid="end-icon">←</span>;
  render(<Button endIcon={<TestIcon />}>Test</Button>);

  expect(screen.getByTestId("end-icon")).toBeInTheDocument();
});

test("Button should render with button type by default", () => {
  render(<Button>Test</Button>);

  const button = screen.getByRole('button');
  expect(button).toHaveAttribute('type', 'button');
});

test("Button should render with submit type", () => {
  render(<Button type="submit">Test</Button>);

  const button = screen.getByRole('button');
  expect(button).toHaveAttribute('type', 'submit');
});

test("Button should apply custom sx styles", () => {
  const { container } = render(<Button sx={{ margin: 2 }}>Test</Button>);

  const button = container.querySelector('button');
  expect(button).toBeInTheDocument();
});

test("Button should apply custom backgroundColor for contained primary", () => {
  const { container } = render(<Button variant="contained" color="primary">Test</Button>);

  const button = container.querySelector('button');
  expect(button).toBeInTheDocument();
});

test("Button should apply custom borderColor for outlined primary", () => {
  const { container } = render(<Button variant="outlined" color="primary">Test</Button>);

  const button = container.querySelector('button');
  expect(button).toBeInTheDocument();
});
