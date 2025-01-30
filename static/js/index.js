console.log('Works!');
fetch('/tasks').then(resp => resp.json()).then(console.log).catch(console.error);
