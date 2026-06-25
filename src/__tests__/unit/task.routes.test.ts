import { describe, it, expect, vi } from 'vitest';

vi.mock('../../controllers/task.controller.js', () => ({
  getAllTasks: vi.fn(),
  getTaskById: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

import router from '../../routes/task.routes.js';
import * as taskController from '../../controllers/task.controller.js';

describe('task.routes', () => {
  it('registers routes with correct handlers', () => {
    const routes = (router as any).stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        methods: layer.route.methods,
        handlers: layer.route.stack.map((s: any) => s.handle),
      }));

    const findHandler = (path: string, method: string) => {
      const rt = routes.find((r: any) => r.path === path && !!r.methods[method]);
      return rt ? rt.handlers[0] : undefined;
    };

    expect(findHandler('/', 'get')).toBe(taskController.getAllTasks);
    expect(findHandler('/:id', 'get')).toBe(taskController.getTaskById);
    expect(findHandler('/', 'post')).toBe(taskController.createTask);
    expect(findHandler('/:id', 'put')).toBe(taskController.updateTask);
    expect(findHandler('/:id', 'delete')).toBe(taskController.deleteTask);
  });
});
