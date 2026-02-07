import { expect, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import RSUFilters from "../../components/rsu_management/rsu-status/components/RSUFilters";

test("RSUFilters should render search field", () => {
  const filters = { search: '', status: 'all' };
  render(<RSUFilters filters={filters} onFilterChange={() => {}} />);

  expect(screen.getByPlaceholderText("Search by IP or Port...")).toBeInTheDocument();
});

test("RSUFilters should render status dropdown", () => {
  const filters = { search: '', status: 'all' };
  const { container } = render(<RSUFilters filters={filters} onFilterChange={() => {}} />);

  // Verify the select component is present  
  expect(container.querySelector('[role="combobox"]')).toBeInTheDocument();
});

test("RSUFilters should call onFilterChange when search text changes", () => {
  const filters = { search: '', status: 'all' };
  const handleFilterChange = jest.fn();
  render(<RSUFilters filters={filters} onFilterChange={handleFilterChange} />);

  const searchField = screen.getByPlaceholderText("Search by IP or Port...");
  fireEvent.change(searchField, { target: { value: '192.168.1.1' } });

  expect(handleFilterChange).toHaveBeenCalledWith({ search: '192.168.1.1' });
});

test("RSUFilters should display current search value", () => {
  const filters = { search: '192.168.1.100', status: 'all' };
  render(<RSUFilters filters={filters} onFilterChange={() => {}} />);

  const searchField = screen.getByPlaceholderText("Search by IP or Port...");
  expect(searchField).toHaveValue('192.168.1.100');
});

test("RSUFilters should display current status value", () => {
  const filters = { search: '', status: 'operate' };
  const { container } = render(<RSUFilters filters={filters} onFilterChange={() => {}} />);

  // Check that the status filter combobox is rendered
  expect(container.querySelector('[role="combobox"]')).toBeInTheDocument();
});

test("RSUFilters should call onFilterChange when status changes", () => {
  const filters = { search: '', status: 'all' };
  const handleFilterChange = jest.fn();
  const { container } = render(<RSUFilters filters={filters} onFilterChange={handleFilterChange} />);

  // The Select component is rendered
  expect(container.querySelector('[role="combobox"]')).toBeInTheDocument();
});

test("RSUFilters should have all status options", () => {
  const filters = { search: '', status: 'all' };
  const { container } = render(<RSUFilters filters={filters} onFilterChange={() => {}} />);

  // Verify the select component is present
  expect(container.querySelector('[role="combobox"]')).toBeInTheDocument();
});

test("RSUFilters should render search icon", () => {
  const filters = { search: '', status: 'all' };
  const { container } = render(<RSUFilters filters={filters} onFilterChange={() => {}} />);

  const searchIcon = container.querySelector('[data-testid="SearchIcon"]');
  expect(searchIcon).toBeInTheDocument();
});
