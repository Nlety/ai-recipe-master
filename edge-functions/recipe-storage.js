async function handleRequest(request) {
    const url = new URL(request.url);
    const KV_NAMESPACE = 'AI_RECIPE';
    if (request.method === 'OPTIONS') return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
    try {
        if (request.method === 'GET' && url.searchParams.get('action') === 'list') {
            const index = await EdgeKV.get(KV_NAMESPACE, 'recipes_index');
            const ids = index ? JSON.parse(index) : [];
            const recipes = [];
            for (const id of ids.slice(0, 50)) { const r = await EdgeKV.get(KV_NAMESPACE, `recipe_${id}`); if (r) recipes.push(JSON.parse(r)); }
            return new Response(JSON.stringify({ recipes }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        if (request.method === 'POST') {
            const body = await request.json();
            if (body.action === 'save' && body.recipe) {
                const recipe = body.recipe;
                await EdgeKV.put(KV_NAMESPACE, `recipe_${recipe.id}`, JSON.stringify(recipe));
                let index = await EdgeKV.get(KV_NAMESPACE, 'recipes_index');
                let ids = index ? JSON.parse(index) : [];
                ids = ids.filter(id => id !== recipe.id);
                ids.unshift(recipe.id);
                if (ids.length > 100) ids = ids.slice(0, 100);
                await EdgeKV.put(KV_NAMESPACE, 'recipes_index', JSON.stringify(ids));
                return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
            }
            if (body.action === 'delete' && body.id) {
                await EdgeKV.delete(KV_NAMESPACE, `recipe_${body.id}`);
                let index = await EdgeKV.get(KV_NAMESPACE, 'recipes_index');
                let ids = index ? JSON.parse(index) : [];
                ids = ids.filter(id => id !== body.id);
                await EdgeKV.put(KV_NAMESPACE, 'recipes_index', JSON.stringify(ids));
                return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
            }
        }
        return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    } catch (error) { return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }); }
}
addEventListener('fetch', event => { event.respondWith(handleRequest(event.request)); });
