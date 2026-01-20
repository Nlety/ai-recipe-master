/**
 * 存储服务 - 食谱收藏
 */
const STORAGE_KEY = 'ai_recipe_collection';
const API_BASE = '/api/recipe-storage';

async function getRecipes() {
    try {
        const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        try {
            const response = await fetch(`${API_BASE}?action=list`);
            if (response.ok) { const cloud = await response.json(); if (cloud.recipes) { const merged = mergeData(local, cloud.recipes); localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); return merged; } }
        } catch (e) { }
        return local;
    } catch (e) { return []; }
}

function mergeData(local, cloud) { const map = new Map();[...local, ...cloud].forEach(r => { if (!map.has(r.id) || r.updatedAt > map.get(r.id).updatedAt) map.set(r.id, r); }); return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt); }

async function saveRecipe(recipe) {
    try {
        const recipes = await getRecipes();
        const now = Date.now();
        if (!recipe.id) { recipe.id = `recipe_${now}_${Math.random().toString(36).slice(2, 8)}`; recipe.createdAt = now; }
        recipe.updatedAt = now;
        const index = recipes.findIndex(r => r.id === recipe.id);
        if (index >= 0) recipes[index] = recipe; else recipes.unshift(recipe);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
        let cloudSync = false;
        try { const r = await fetch(API_BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save', recipe }) }); cloudSync = r.ok; } catch (e) { }
        return { success: true, cloudSync, recipe };
    } catch (e) { return { success: false, error: e.message }; }
}

async function deleteRecipe(id) {
    try {
        let recipes = await getRecipes();
        recipes = recipes.filter(r => r.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
        try { await fetch(API_BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) }); } catch (e) { }
        return { success: true };
    } catch (e) { return { success: false }; }
}

window.StorageService = { getRecipes, saveRecipe, deleteRecipe };
