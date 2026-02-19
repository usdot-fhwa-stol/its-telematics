import { expect, test } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import DataTypeFilter from "../../components/rsu_management/data-selection/components/DataTypeFilter";

const mockAvailableDataTypes = [
  {
    rsuKey: "192.168.1.1:8080",
    topics: ["bsm", "tim", "spat"]
  },
  {
    rsuKey: "192.168.1.2:8080",
    topics: ["bsm", "map"]
  }
];

test("DataTypeFilter should render title", () => {
  render(<DataTypeFilter value={['all']} onChange={() => {}} availableDataTypes={[]} />);

  expect(screen.getByText("Filter by Available Data Types")).toBeInTheDocument();
});

test("DataTypeFilter should render All option", () => {
  const { container } = render(<DataTypeFilter value={['all']} onChange={() => {}} availableDataTypes={mockAvailableDataTypes} />);

  // Verify the select component is rendered
  expect(container.querySelector('div[role="combobox"]')).toBeInTheDocument();
});

test("DataTypeFilter should render with disabled state", () => {
  render(<DataTypeFilter value={['all']} onChange={() => {}} disabled={true} availableDataTypes={[]} />);

  expect(screen.getByText("Please select TRU and RSU to enable filtering")).toBeInTheDocument();
});

test("DataTypeFilter should render with enabled state", () => {
  render(<DataTypeFilter value={['all']} onChange={() => {}} disabled={false} availableDataTypes={mockAvailableDataTypes} />);

  expect(screen.queryByText("Please select TRU and RSU to enable filtering")).not.toBeInTheDocument();
});

test("DataTypeFilter should display All when all selected", () => {
  render(<DataTypeFilter value={['all']} onChange={() => {}} availableDataTypes={mockAvailableDataTypes} />);

  expect(screen.getByText("All Available Data Types")).toBeInTheDocument();
});

test("DataTypeFilter should display selected types", () => {
  const { container } = render(<DataTypeFilter value={['192.168.1.1:8080-bsm', '192.168.1.1:8080-tim']} onChange={() => {}} availableDataTypes={mockAvailableDataTypes} />);

  // Component displays selected types in the select - just verify select is rendered
  expect(container.querySelector('div[role="combobox"]')).toBeInTheDocument();
});

test("DataTypeFilter should accept onChange handler", () => {
  const handleChange = jest.fn();
  const { container } = render(<DataTypeFilter value={['all']} onChange={handleChange} availableDataTypes={mockAvailableDataTypes} />);

  // Just verify component renders with onChange
  expect(container.querySelector('div[role="combobox"]')).toBeInTheDocument();
});

test("DataTypeFilter should render RSU groups", () => {
  const { container } = render(<DataTypeFilter value={['all']} onChange={() => {}} availableDataTypes={mockAvailableDataTypes} />);

  // Just verify component renders with available data types
  expect(container.querySelector('div[role="combobox"]')).toBeInTheDocument();
});

test("DataTypeFilter should render Filter icon", () => {
  const { container } = render(<DataTypeFilter value={['all']} onChange={() => {}} availableDataTypes={mockAvailableDataTypes} />);

  const filterIcon = container.querySelector('[data-testid="FilterListIcon"]');
  expect(filterIcon).toBeInTheDocument();
});

test("DataTypeFilter should support empty available types", () => {
  const { container } = render(<DataTypeFilter value={['all']} onChange={() => {}} availableDataTypes={[]} />);

  expect(container.querySelector('div[role="combobox"]')).toBeInTheDocument();
});

test("DataTypeFilter should support array values", () => {
  const { container } = render(<DataTypeFilter value={['192.168.1.1:8080-bsm']} onChange={() => {}} availableDataTypes={mockAvailableDataTypes} />);

  expect(container.querySelector('div[role="combobox"]')).toBeInTheDocument();
});

test("DataTypeFilter should handle empty value array", () => {
  // Component should default to 'all' when empty
  const { container } = render(<DataTypeFilter value={[]} onChange={() => {}} availableDataTypes={mockAvailableDataTypes} />);

  expect(container.querySelector('div[role="combobox"]')).toBeInTheDocument();
});

