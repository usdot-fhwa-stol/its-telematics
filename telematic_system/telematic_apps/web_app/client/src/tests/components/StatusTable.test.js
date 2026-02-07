import { expect, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import StatusTable from "../../components/rsu_management/common/StatusTable";

// Mock StatusBadge component
jest.mock("../../components/rsu_management/common/StatusBadge", () => {
  return function MockStatusBadge({ status, online }) {
    return <span data-testid="status-badge">{status || (online ? 'Online' : 'Offline')}</span>;
  };
});

const mockColumns = [
  { field: 'id', headerName: 'ID', sortable: true },
  { field: 'name', headerName: 'Name', sortable: true },
  { field: 'status', headerName: 'Status' }
];

const mockData = [
  { id: '1', name: 'Test 1', status: 'operate' },
  { id: '2', name: 'Test 2', status: 'standby' }
];

test("StatusTable should show loading spinner when loading", () => {
  render(<StatusTable data={[]} columns={mockColumns} loading={true} />);

  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});

test("StatusTable should show empty message when no data", () => {
  render(<StatusTable data={[]} columns={mockColumns} loading={false} />);

  expect(screen.getByText("No data available")).toBeInTheDocument();
});

test("StatusTable should show custom empty message", () => {
  render(
    <StatusTable 
      data={[]} 
      columns={mockColumns} 
      loading={false} 
      emptyMessage="No items found"
    />
  );

  expect(screen.getByText("No items found")).toBeInTheDocument();
});

test("StatusTable should render data correctly", () => {
  render(<StatusTable data={mockData} columns={mockColumns} loading={false} />);

  expect(screen.getByText("ID")).toBeInTheDocument();
  expect(screen.getByText("Name")).toBeInTheDocument();
  expect(screen.getByText("Status")).toBeInTheDocument();
  expect(screen.getByText("Test 1")).toBeInTheDocument();
  expect(screen.getByText("Test 2")).toBeInTheDocument();
});

test("StatusTable should render status badges", () => {
  render(<StatusTable data={mockData} columns={mockColumns} loading={false} />);

  const badges = screen.getAllByTestId("status-badge");
  expect(badges).toHaveLength(2);
});

test("StatusTable should call onRowClick when row clicked", () => {
  const handleRowClick = jest.fn();
  render(
    <StatusTable 
      data={mockData} 
      columns={mockColumns} 
      loading={false} 
      onRowClick={handleRowClick}
    />
  );

  const rows = screen.getAllByRole('row');
  // Click the first data row (index 1, since index 0 is header)
  fireEvent.click(rows[1]);

  expect(handleRowClick).toHaveBeenCalledWith(mockData[0]);
});

test("StatusTable should handle null data gracefully", () => {
  render(<StatusTable data={null} columns={mockColumns} loading={false} />);

  expect(screen.getByText("No data available")).toBeInTheDocument();
});

test("StatusTable should render custom cell content", () => {
  const customColumns = [
    { 
      field: 'name', 
      headerName: 'Name', 
      render: (row) => <span data-testid="custom-cell">{row.name.toUpperCase()}</span>
    }
  ];

  render(<StatusTable data={mockData} columns={customColumns} loading={false} />);

  expect(screen.getByText("TEST 1")).toBeInTheDocument();
  expect(screen.getByText("TEST 2")).toBeInTheDocument();
});

test("StatusTable should handle timestamp type", () => {
  const timestampData = [
    { id: '1', name: 'Test', timestamp: 1706745600000 }
  ];
  const timestampColumns = [
    { field: 'name', headerName: 'Name' },
    { field: 'timestamp', headerName: 'Timestamp', type: 'timestamp' }
  ];

  render(<StatusTable data={timestampData} columns={timestampColumns} loading={false} />);

  expect(screen.getByText("Test")).toBeInTheDocument();
});

test("StatusTable should handle array values", () => {
  const arrayData = [
    { id: '1', name: 'Test', tags: ['tag1', 'tag2'] }
  ];
  const arrayColumns = [
    { field: 'name', headerName: 'Name' },
    { field: 'tags', headerName: 'Tags' }
  ];

  render(<StatusTable data={arrayData} columns={arrayColumns} loading={false} />);

  expect(screen.getByText("Test")).toBeInTheDocument();
});
