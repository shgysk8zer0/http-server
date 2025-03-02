// In-memory storage for demo
import { createHandler } from '../handler.js';
import { HTTPError } from '../HTTPError.js';

const tasks = new Map();

const headers = new Headers({ 'Cache-Control': 'no-store' });

export default createHandler({
	get(req, { params }) {
		if (typeof params.id === 'string') {
			const task = tasks.get(params.id);

			if (typeof task?.title !== 'string') {
				throw new HTTPError('Task not found.', { status: 404, headers });
			} else {
				return Response.json(task);
			}
		} else {
			return Response.json(Array.from(tasks.values()));
		}
	},
	async post(req) {
		const task = await req.json();

		if (typeof task.title !== 'string') {
			throw new HTTPError('Task is missing required fields.', { status: 400, headers });
		} else {
			const newTask = {
				id: crypto.randomUUID(),
				title: task.title.trim(),
				description: task.description?.trim() ?? '',
				created: new Date().toISOString(),
				completed: false
			};

			tasks.set(newTask.id, newTask);

			return Response.json(newTask, {
				status: 201,
				headers: { 'Location': new URL(`/tasks?/${newTask.id}`, req.url), 'Cache-Control': headers.get('Cache-Control') },
			});
		}
	},
	async patch(req, { params }) {
		const id = params.id;

		if (! (typeof id === 'string' && tasks.has(id))) {
			throw new HTTPError('Task not found.', { status: 404 });
		} else {
			const updates = await req.json();
			const task = tasks.get(id);
			const updatedTask = {
				...task,
				...updates,
				id, // Prevent ID modification
				modified: new Date().toISOString()
			};

			tasks.set(id, updatedTask);

			return Response.json(updatedTask, { headers });
		}
	},
	delete(req, { params }) {
		const id = params.id;

		if (! (typeof id === 'string' && tasks.has(id))) {
			throw new HTTPError('Task not found.', { status: 404, headers });
		} else {
			tasks.delete(id);
			return new Response(null, { status: 204, headers });
		}
	}
});
