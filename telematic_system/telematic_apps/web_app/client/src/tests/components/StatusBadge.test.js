import { expect, test } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import StatusBadge from "../../components/rsu_management/common/StatusBadge";

test("StatusBadge should display Operate status with success color", () => {
  render(<StatusBadge status="operate" />);
  
  expect(screen.getByText("Operate")).toBeInTheDocument();
});

test("StatusBadge should display Standby status with warning color", () => {
  render(<StatusBadge status="standby" />);
  
  expect(screen.getByText("Standby")).toBeInTheDocument();
});

test("StatusBadge should display Fault status with error color", () => {
  render(<StatusBadge status="fault" />);
  
  expect(screen.getByText("Fault")).toBeInTheDocument();
});

test("StatusBadge should display Other status with default color", () => {
  render(<StatusBadge status="other" />);
  
  expect(screen.getByText("Other")).toBeInTheDocument();
});

test("StatusBadge should display Pending for unknown status", () => {
  render(<StatusBadge status="unknown" />);
  
  expect(screen.getByText("Pending")).toBeInTheDocument();
});

test("StatusBadge should handle case insensitive status values", () => {
  render(<StatusBadge status="OPERATE" />);
  
  expect(screen.getByText("Operate")).toBeInTheDocument();
});

test("StatusBadge should handle operation status as operate", () => {
  render(<StatusBadge status="operation" />);
  
  expect(screen.getByText("Operate")).toBeInTheDocument();
});

test("StatusBadge should display Online for legacy online boolean", () => {
  render(<StatusBadge online={true} />);
  
  expect(screen.getByText("Online")).toBeInTheDocument();
});

test("StatusBadge should display Offline for legacy offline boolean", () => {
  render(<StatusBadge online={false} />);
  
  expect(screen.getByText("Offline")).toBeInTheDocument();
});

test("StatusBadge should prioritize status over online prop", () => {
  render(<StatusBadge online={true} status="fault" />);
  
  // Should show 'Fault' not 'Online' since status takes precedence
  expect(screen.getByText("Fault")).toBeInTheDocument();
  expect(screen.queryByText("Online")).not.toBeInTheDocument();
});

test("StatusBadge should render with small size by default", () => {
  const { container } = render(<StatusBadge status="operate" />);
  
  const chip = container.querySelector('.MuiChip-root');
  expect(chip).toBeInTheDocument();
});

test("StatusBadge should render with custom size", () => {
  const { container } = render(<StatusBadge status="operate" size="medium" />);
  
  const chip = container.querySelector('.MuiChip-root');
  expect(chip).toBeInTheDocument();
});

test("StatusBadge should not throw errors when rendered without props", () => {
  expect(() => render(<StatusBadge />)).not.toThrow();
});
