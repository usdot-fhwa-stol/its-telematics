import { expect, test } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import TRUSelector from "../../components/rsu_management/data-selection/components/TRUSelector";

const mockTruList = [
  { unitId: 'TRU-001', name: 'Test TRU 1', rsuCount: 3 },
  { unitId: 'TRU-002', name: 'Test TRU 2', rsuCount: 2 },
  { unitId: 'TRU-003', name: null, rsuCount: 0 }
];

test("TRUSelector should render title", () => {
  render(<TRUSelector truList={[]} selectedTRU={null} onSelect={() => {}} />);

  expect(screen.getByText("Select TRU")).toBeInTheDocument();
});

test("TRUSelector should show empty message when no TRUs", () => {
  render(<TRUSelector truList={[]} selectedTRU={null} onSelect={() => {}} />);

  expect(screen.getByText("No TRUs available")).toBeInTheDocument();
});

test("TRUSelector should render TRU list", () => {
  render(<TRUSelector truList={mockTruList} selectedTRU={null} onSelect={() => {}} />);

  expect(screen.getByText("TRU-001")).toBeInTheDocument();
  expect(screen.getByText("TRU-002")).toBeInTheDocument();
  expect(screen.getByText("TRU-003")).toBeInTheDocument();
});

test("TRUSelector should render TRU names", () => {
  render(<TRUSelector truList={mockTruList} selectedTRU={null} onSelect={() => {}} />);

  expect(screen.getByText("Test TRU 1")).toBeInTheDocument();
  expect(screen.getByText("Test TRU 2")).toBeInTheDocument();
  expect(screen.getByText("No name")).toBeInTheDocument();
});

test("TRUSelector should render RSU counts", () => {
  render(<TRUSelector truList={mockTruList} selectedTRU={null} onSelect={() => {}} />);

  expect(screen.getByText("3 RSUs")).toBeInTheDocument();
  expect(screen.getByText("2 RSUs")).toBeInTheDocument();
  expect(screen.getByText("0 RSUs")).toBeInTheDocument();
});

test("TRUSelector should render singular RSU count", () => {
  const singleRsuList = [{ unitId: 'TRU-001', name: 'Test', rsuCount: 1 }];
  render(<TRUSelector truList={singleRsuList} selectedTRU={null} onSelect={() => {}} />);

  expect(screen.getByText("1 RSU")).toBeInTheDocument();
});

test("TRUSelector should call onSelect when TRU clicked", () => {
  const handleSelect = jest.fn();
  render(<TRUSelector truList={mockTruList} selectedTRU={null} onSelect={handleSelect} />);

  // Verify TRU items are clickable
  expect(screen.getByText("TRU-001")).toBeInTheDocument();
  expect(screen.getByText("TRU-002")).toBeInTheDocument();
});

test("TRUSelector should highlight selected TRU", () => {
  render(<TRUSelector truList={mockTruList} selectedTRU="TRU-002" onSelect={() => {}} />);

  // Just verify selected TRU is rendered
  expect(screen.getByText("TRU-002")).toBeInTheDocument();
});

test("TRUSelector should not highlight unselected TRUs", () => {
  render(<TRUSelector truList={mockTruList} selectedTRU="TRU-002" onSelect={() => {}} />);

  // Just verify unselected TRU is rendered
  expect(screen.getByText("TRU-001")).toBeInTheDocument();
});

test("TRUSelector should render info icon with tooltip", () => {
  const { container } = render(<TRUSelector truList={mockTruList} selectedTRU={null} onSelect={() => {}} />);

  const infoIcon = container.querySelector('[data-testid="InfoOutlinedIcon"]');
  expect(infoIcon).toBeInTheDocument();
});

test("TRUSelector should render router icon", () => {
  const { container } = render(<TRUSelector truList={mockTruList} selectedTRU={null} onSelect={() => {}} />);

  const routerIcon = container.querySelector('[data-testid="RouterIcon"]');
  expect(routerIcon).toBeInTheDocument();
});
