import { expect, jest, test } from '@jest/globals';
import axios from 'axios';
import rsuService from '../../api/api-rsu';

jest.mock('axios');

beforeEach(() => {
    jest.clearAllMocks();
});

test('getTRUStatuses should fetch all TRU statuses', async () => {
    const mockData = {
        data: [
            { unitId: 'TRU-001', unitName: 'Test TRU 1', unitType: 'RSU' },
            { unitId: 'TRU-002', unitName: 'Test TRU 2', unitType: 'RSU' }
        ]
    };
    axios.get.mockResolvedValue({ data: mockData });

    const result = await rsuService.getTRUStatuses();

    expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/rsu-registration/all-tru-config'),
        expect.objectContaining({ withCredentials: true })
    );
    expect(result).toEqual(mockData.data);
});

test('getTRUStatuses should handle response without data property', async () => {
    const mockResponse = [
        { unitId: 'TRU-001', unitName: 'Test TRU 1' }
    ];
    axios.get.mockResolvedValue({ data: mockResponse });

    const result = await rsuService.getTRUStatuses();

    expect(result).toEqual(mockResponse);
});

test('getTRUStatuses should throw error on failure', async () => {
    const mockError = new Error('Network error');
    axios.get.mockRejectedValue(mockError);

    await expect(rsuService.getTRUStatuses()).rejects.toThrow('Network error');
});

test('assignRSU should register RSU to TRU', async () => {
    const truConfigMessage = {
        unitId: 'TRU-001',
        rsuIp: '192.168.1.100',
        rsuId: 'RSU-001'
    };
    const mockResponse = { data: { status: 'success', data: truConfigMessage } };
    axios.post.mockResolvedValue(mockResponse);

    const result = await rsuService.assignRSU(truConfigMessage);

    expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/rsu-registration/assign-rsu'),
        truConfigMessage,
        expect.objectContaining({ withCredentials: true })
    );
    expect(result).toEqual(truConfigMessage);
});

test('assignRSU should throw error on failure', async () => {
    const truConfigMessage = { unitId: 'TRU-001' };
    const mockError = new Error('Assignment failed');
    axios.post.mockRejectedValue(mockError);

    await expect(rsuService.assignRSU(truConfigMessage)).rejects.toThrow('Assignment failed');
});

test('updateRSUConfig should update RSU configuration', async () => {
    const truConfigMessage = {
        unitId: 'TRU-001',
        rsuIp: '192.168.1.101',
        rsuId: 'RSU-001'
    };
    const mockResponse = { data: { data: truConfigMessage } };
    axios.post.mockResolvedValue(mockResponse);

    const result = await rsuService.updateRSUConfig(truConfigMessage);

    expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/rsu-registration/update-rsu-config'),
        truConfigMessage,
        expect.objectContaining({ withCredentials: true })
    );
    expect(result).toEqual(truConfigMessage);
});

test('updateRSUConfig should throw error on failure', async () => {
    const truConfigMessage = { unitId: 'TRU-001' };
    const mockError = new Error('Update failed');
    axios.post.mockRejectedValue(mockError);

    await expect(rsuService.updateRSUConfig(truConfigMessage)).rejects.toThrow('Update failed');
});

test('removeRSU should remove RSU assignment', async () => {
    const truConfigMessage = {
        unitId: 'TRU-001',
        rsuId: 'RSU-001'
    };
    const mockResponse = { data: { status: 'success' } };
    axios.post.mockResolvedValue(mockResponse);

    const result = await rsuService.removeRSU(truConfigMessage);

    expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/rsu-registration/remove-rsu'),
        truConfigMessage,
        expect.objectContaining({ withCredentials: true })
    );
    expect(result).toEqual(mockResponse.data);
});

test('removeRSU should handle response without data property', async () => {
    const truConfigMessage = { unitId: 'TRU-001' };
    const mockResponse = { data: { status: 'success' } };
    axios.post.mockResolvedValue(mockResponse);

    const result = await rsuService.removeRSU(truConfigMessage);

    expect(result).toEqual(mockResponse.data);
});

test('removeRSU should throw error on failure', async () => {
    const truConfigMessage = { unitId: 'TRU-001' };
    const mockError = new Error('Remove failed');
    axios.post.mockRejectedValue(mockError);

    await expect(rsuService.removeRSU(truConfigMessage)).rejects.toThrow('Remove failed');
});

test('getAvailableTopics should fetch available topics for TRU', async () => {
    const truTopicsMessage = {
        unitId: 'TRU-001'
    };
    const mockData = {
        data: ['topic1', 'topic2', 'topic3']
    };
    axios.post.mockResolvedValue({ data: mockData });

    const result = await rsuService.getAvailableTopics(truTopicsMessage);

    expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/data-selection/available-topics'),
        truTopicsMessage,
        expect.objectContaining({ withCredentials: true })
    );
    expect(result).toEqual(mockData.data);
});

test('getAvailableTopics should handle response without data property', async () => {
    const truTopicsMessage = { unitId: 'TRU-001' };
    const mockTopics = ['topic1', 'topic2'];
    axios.post.mockResolvedValue({ data: mockTopics });

    const result = await rsuService.getAvailableTopics(truTopicsMessage);

    expect(result).toEqual(mockTopics);
});

test('getAvailableTopics should throw error on failure', async () => {
    const truTopicsMessage = { unitId: 'TRU-001' };
    const mockError = new Error('Failed to fetch topics');
    axios.post.mockRejectedValue(mockError);

    await expect(rsuService.getAvailableTopics(truTopicsMessage)).rejects.toThrow('Failed to fetch topics');
});

test('confirmDataSelection should confirm selected topics', async () => {
    const truTopicsMessage = {
        unitId: 'TRU-001',
        rsuTopics: ['topic1', 'topic2']
    };
    const mockResponse = { data: { data: truTopicsMessage } };
    axios.post.mockResolvedValue(mockResponse);

    const result = await rsuService.confirmDataSelection(truTopicsMessage);

    expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/data-selection/confirm-topics'),
        truTopicsMessage,
        expect.objectContaining({ withCredentials: true })
    );
    expect(result).toEqual(truTopicsMessage);
});

test('confirmDataSelection should handle response without data property', async () => {
    const truTopicsMessage = {
        unitId: 'TRU-001',
        rsuTopics: ['topic1']
    };
    const mockResponse = { data: truTopicsMessage };
    axios.post.mockResolvedValue(mockResponse);

    const result = await rsuService.confirmDataSelection(truTopicsMessage);

    expect(result).toEqual(truTopicsMessage);
});

test('confirmDataSelection should throw error on failure', async () => {
    const truTopicsMessage = { unitId: 'TRU-001', rsuTopics: [] };
    const mockError = new Error('Confirmation failed');
    axios.post.mockRejectedValue(mockError);

    await expect(rsuService.confirmDataSelection(truTopicsMessage)).rejects.toThrow('Confirmation failed');
});
