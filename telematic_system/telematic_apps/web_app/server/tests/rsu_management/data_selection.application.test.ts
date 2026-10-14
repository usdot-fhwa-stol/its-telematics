import { GetAvailableTopics } from '../../application/rsu_management/get_available_topics';
import { ConfirmDataSelection } from '../../application/rsu_management/confirm_data_selection';
import { TRUTopicsMessage } from '../../models/rsu_management/tru_topics_message.model';
import { RSUTopicsMessage } from '../../models/rsu_management/rsu_topics_message.model';
import { TopicMessage } from '../../models/rsu_management/topic_message.model';
import { RSUEndpoint } from '../../models/rsu_management/rsu_endpoint.model';


describe('Data selection application services', () => {
  const makeTruTopics = (): TRUTopicsMessage => {
    const endpoint = new RSUEndpoint('192.168.0.10', 502);
    const topics = [new TopicMessage('bsm', true)];
    const rsuTopic = new RSUTopicsMessage(topics, endpoint);
    return new TRUTopicsMessage('Unit001', [rsuTopic], Date.now());
  };

  test('GetAvailableTopics calls repository.getAvailableTopics with valid message', async () => {
    const repo = { getAvailableTopics: jest.fn().mockResolvedValue(makeTruTopics()) } as any;
    const app = new GetAvailableTopics(repo);
    const msg = makeTruTopics();

    const result = await app.execute(msg);

    expect(repo.getAvailableTopics).toHaveBeenCalledWith(msg);
    expect(result.unitId).toBe('Unit001');
  });

  test('GetAvailableTopics throws when unitId is missing', async () => {
    const repo = { getAvailableTopics: jest.fn() } as any;
    const app = new GetAvailableTopics(repo);

    await expect(app.execute({} as any)).rejects.toThrow('Unit ID is required');
  });

  test('ConfirmDataSelection calls repository.confirmDataSelection with valid message', async () => {
    const msg = makeTruTopics();
    const repo = { confirmDataSelection: jest.fn().mockResolvedValue(msg) } as any;
    const app = new ConfirmDataSelection(repo);

    const result = await app.execute(msg);

    expect(repo.confirmDataSelection).toHaveBeenCalledWith(msg);
    expect(result.unitId).toBe('Unit001');
  });

  test('ConfirmDataSelection allows empty rsuTopics to stop broadcast', async () => {
    const msg = new TRUTopicsMessage('Unit001', [], Date.now());
    const repo = { confirmDataSelection: jest.fn().mockResolvedValue(msg) } as any;
    const app = new ConfirmDataSelection(repo);

    const result = await app.execute(msg);
    expect(repo.confirmDataSelection).toHaveBeenCalledWith(msg);
    expect(result).toBe(msg);
  });
});
