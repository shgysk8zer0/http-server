// In-memory storage for demo
const tasks = new Map();

export default async function(req) {
	try {
		switch (req.method) {
			case 'GET': {
				const url = new URL(req.url);

				if (url.searchParams.has('id')) {
					const task = tasks.get(url.searchParams.get('id'));

					if (typeof task?.title !== 'string') {
						return new Response('Task not found', { status: 404 });
					} else {
						return Response.json(task);
					}
				} else {
					return Response.json(Array.from(tasks.values()));
				}
			}

			case 'POST': {
				const task = await req.json();

				if (typeof task.title !== 'string') {
					return new Response('Title is required', { status: 400 });
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
						headers: { 'Location': `/tasks?id=${newTask.id}` }
					});
				}
			}

			case 'PATCH': {
				const url = new URL(req.url);
				const id = url.searchParams.get('id');

				if (! (typeof id === 'string' && tasks.has(id))) {
					return new Response('Task not found', { status: 404 });
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

					return Response.json(updatedTask);
				}

			}

			case 'DELETE': {
				const url = new URL(req.url);
				const id = url.searchParams.get('id');

				if (! (typeof id === 'string' && tasks.has(id))) {
					return new Response('Task not found', { status: 404 });
				} else {
					tasks.delete(id);
					return new Response(null, { status: 204 });
				}
			}

			default:
				return new Response('Method not allowed', {
					status: 405,
					headers: {
						'Allow': 'GET, POST, PATCH, DELETE'
					}
				});
		}
	} catch (error) {
		return new Response(error.message, { status: 500 });
	}
}
