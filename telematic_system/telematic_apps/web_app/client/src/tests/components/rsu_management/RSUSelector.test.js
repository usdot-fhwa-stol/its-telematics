import { expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import RSUSelector from "../../../components/rsu_management/data-selection/components/RSUSelector";

const mockRSUList = [
  { ip: "192.168.1.1", port: 8080 },
  { ip: "192.168.1.2", port: 8081 },
  { ip: "192.168.1.3", port: 8082 },
];

test("RSUSelector should render title", () => {
  render(
    <RSUSelector
      rsuList={mockRSUList}
      selectedRSUs={[]}
      onSelect={() => {}}
      disabled={false}
    />
  );

  expect(screen.getByText("Select RSU(s)")).toBeInTheDocument();
});

test("RSUSelector should render RSU list", () => {
  render(
    <RSUSelector
      rsuList={mockRSUList}
      selectedRSUs={[]}
      onSelect={() => {}}
      disabled={false}
    />
  );

  expect(screen.getByText("192.168.1.1")).toBeInTheDocument();
  expect(screen.getByText("192.168.1.2")).toBeInTheDocument();
  expect(screen.getByText("192.168.1.3")).toBeInTheDocument();
});

test("RSUSelector should show selection count", () => {
  render(
    <RSUSelector
      rsuList={mockRSUList}
      selectedRSUs={[mockRSUList[0]]}
      onSelect={() => {}}
      disabled={false}
    />
  );

  expect(screen.getByText("1 of 3 selected")).toBeInTheDocument();
});

test("RSUSelector should show zero selection count initially", () => {
  render(
    <RSUSelector
      rsuList={mockRSUList}
      selectedRSUs={[]}
      onSelect={() => {}}
      disabled={false}
    />
  );

  expect(screen.getByText("0 of 3 selected")).toBeInTheDocument();
});

test("RSUSelector should render checkboxes for each RSU", () => {
  const { container } = render(
    <RSUSelector
      rsuList={mockRSUList}
      selectedRSUs={[]}
      onSelect={() => {}}
      disabled={false}
    />
  );

  const checkboxes = container.querySelectorAll('input[type="checkbox"]');
  expect(checkboxes).toHaveLength(3);
});

test("RSUSelector should check selected RSUs", () => {
  const { container } = render(
    <RSUSelector
      rsuList={mockRSUList}
      selectedRSUs={[mockRSUList[0], mockRSUList[2]]}
      onSelect={() => {}}
      disabled={false}
    />
  );

  const checkboxes = container.querySelectorAll('input[type="checkbox"]');
  expect(checkboxes[0]).toBeChecked();
  expect(checkboxes[1]).not.toBeChecked();
  expect(checkboxes[2]).toBeChecked();
});

test("RSUSelector should call onSelect when checkbox clicked to select", () => {
  const mockOnSelect = jest.fn();
  const { container } = render(
    <RSUSelector
      rsuList={mockRSUList}
      selectedRSUs={[]}
      onSelect={mockOnSelect}
      disabled={false}
    />
  );

  const firstCheckbox = container.querySelectorAll('input[type="checkbox"]')[0];
  fireEvent.click(firstCheckbox);

  expect(mockOnSelect).toHaveBeenCalledTimes(1);
  expect(mockOnSelect).toHaveBeenCalledWith([mockRSUList[0]]);
});

test("RSUSelector should call onSelect when checkbox clicked to deselect", () => {
  const mockOnSelect = jest.fn();
  const { container } = render(
    <RSUSelector
      rsuList={mockRSUList}
      selectedRSUs={[mockRSUList[0], mockRSUList[1]]}
      onSelect={mockOnSelect}
      disabled={false}
    />
  );

  const firstCheckbox = container.querySelectorAll('input[type="checkbox"]')[0];
  fireEvent.click(firstCheckbox);

  expect(mockOnSelect).toHaveBeenCalledTimes(1);
  expect(mockOnSelect).toHaveBeenCalledWith([mockRSUList[1]]);
});

test("RSUSelector should add RSU to selection", () => {
  const mockOnSelect = jest.fn();
  const { container } = render(
    <RSUSelector
      rsuList={mockRSUList}
      selectedRSUs={[mockRSUList[0]]}
      onSelect={mockOnSelect}
      disabled={false}
    />
  );

  const secondCheckbox = container.querySelectorAll('input[type="checkbox"]')[1];
  fireEvent.click(secondCheckbox);

  expect(mockOnSelect).toHaveBeenCalledWith([mockRSUList[0], mockRSUList[1]]);
});

test("RSUSelector should display disabled message when disabled", () => {
  render(
    <RSUSelector
      rsuList={mockRSUList}
      selectedRSUs={[]}
      onSelect={() => {}}
      disabled={true}
    />
  );

  expect(screen.getByText("Please select a TRU first")).toBeInTheDocument();
});

test("RSUSelector should not render RSU list when disabled", () => {
  render(
    <RSUSelector
      rsuList={mockRSUList}
      selectedRSUs={[]}
      onSelect={() => {}}
      disabled={true}
    />
  );

  expect(screen.queryByText("192.168.1.1")).not.toBeInTheDocument();
});

test("RSUSelector should display empty message when no RSUs", () => {
  render(
    <RSUSelector
      rsuList={[]}
      selectedRSUs={[]}
      onSelect={() => {}}
      disabled={false}
    />
  );

  expect(screen.getByText("No RSUs available for this TRU")).toBeInTheDocument();
});

test("RSUSelector should show 0 of 0 when empty list", () => {
  render(
    <RSUSelector
      rsuList={[]}
      selectedRSUs={[]}
      onSelect={() => {}}
      disabled={false}
    />
  );

  expect(screen.getByText("0 of 0 selected")).toBeInTheDocument();
});

test("RSUSelector should render IP addresses", () => {
  render(
    <RSUSelector
      rsuList={mockRSUList}
      selectedRSUs={[]}
      onSelect={() => {}}
      disabled={false}
    />
  );

  expect(screen.getByText("192.168.1.1")).toBeInTheDocument();
  expect(screen.getByText("192.168.1.2")).toBeInTheDocument();
});

test("RSUSelector should handle empty selectedRSUs prop", () => {
  render(
    <RSUSelector
      rsuList={mockRSUList}
      onSelect={() => {}}
      disabled={false}
    />
  );

  expect(screen.getByText("0 of 3 selected")).toBeInTheDocument();
});

test("RSUSelector should render antenna icon", () => {
  const { container } = render(
    <RSUSelector
      rsuList={mockRSUList}
      selectedRSUs={[]}
      onSelect={() => {}}
      disabled={false}
    />
  );

  const icon = container.querySelector('svg[data-testid="SettingsInputAntennaIcon"]');
  expect(icon).toBeInTheDocument();
});

test("RSUSelector should render tooltip icon", () => {
  const { container } = render(
    <RSUSelector
      rsuList={mockRSUList}
      selectedRSUs={[]}
      onSelect={() => {}}
      disabled={false}
    />
  );

  const icon = container.querySelector('svg[data-testid="InfoOutlinedIcon"]');
  expect(icon).toBeInTheDocument();
});
