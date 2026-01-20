/**
 * AI 食谱大师 - 主应用
 */
const DOM = {};
const AppState = { ingredients: '', taste: '', time: '', difficulty: '', servings: '2', currentRecipe: null, recipes: [] };

function initDOM() {
    DOM.ingredientsInput = document.getElementById('ingredients-input');
    DOM.tasteSelect = document.getElementById('taste-select');
    DOM.timeSelect = document.getElementById('time-select');
    DOM.difficultySelect = document.getElementById('difficulty-select');
    DOM.servingsSelect = document.getElementById('servings-select');
    DOM.btnGenerate = document.getElementById('btn-generate');
    DOM.recipeResult = document.getElementById('recipe-result');
    DOM.recipeTitle = document.getElementById('recipe-title');
    DOM.recipeMeta = document.getElementById('recipe-meta');
    DOM.recipeContent = document.getElementById('recipe-content');
    DOM.collectionPanel = document.getElementById('collection-panel');
    DOM.collectionList = document.getElementById('collection-list');
    DOM.collectionOverlay = document.getElementById('collection-overlay');
    DOM.settingsModal = document.getElementById('settings-modal');
    DOM.loadingOverlay = document.getElementById('loading-overlay');
    DOM.loadingText = document.getElementById('loading-text');
    DOM.toast = document.getElementById('toast');
}

function initEvents() {
    DOM.ingredientsInput.addEventListener('input', () => AppState.ingredients = DOM.ingredientsInput.value);
    DOM.tasteSelect.addEventListener('change', () => AppState.taste = DOM.tasteSelect.value);
    DOM.timeSelect.addEventListener('change', () => AppState.time = DOM.timeSelect.value);
    DOM.difficultySelect.addEventListener('change', () => AppState.difficulty = DOM.difficultySelect.value);
    DOM.servingsSelect.addEventListener('change', () => AppState.servings = DOM.servingsSelect.value);

    DOM.btnGenerate.addEventListener('click', generateRecipe);
    document.getElementById('btn-save-recipe').addEventListener('click', saveCurrentRecipe);

    document.getElementById('btn-collection').addEventListener('click', () => { DOM.collectionPanel.classList.add('open'); DOM.collectionOverlay.classList.remove('hidden'); });
    document.getElementById('btn-close-collection').addEventListener('click', closeCollection);
    DOM.collectionOverlay.addEventListener('click', closeCollection);

    document.getElementById('btn-settings').addEventListener('click', () => { DOM.settingsModal.classList.add('show'); loadSettings(); });
    document.getElementById('btn-close-settings').addEventListener('click', () => DOM.settingsModal.classList.remove('show'));
    document.getElementById('btn-cancel-settings').addEventListener('click', () => DOM.settingsModal.classList.remove('show'));
    document.getElementById('btn-save-settings').addEventListener('click', saveSettings);

    document.querySelectorAll('.example-btn').forEach(btn => btn.addEventListener('click', () => loadExample(btn.dataset.example)));
}

const EXAMPLES = {
    home: { ingredients: '土豆、猪肉、青椒、大蒜、生姜', taste: '', time: '30', difficulty: 'easy' },
    quick: { ingredients: '鸡蛋、西红柿、葱', taste: 'light', time: '15', difficulty: 'easy' },
    healthy: { ingredients: '鸡胸肉、西兰花、胡萝卜、橄榄油', taste: 'light', time: '30', difficulty: 'easy' },
    dessert: { ingredients: '牛奶、鸡蛋、白糖、面粉、黄油', taste: 'sweet', time: '60', difficulty: 'medium' }
};

function loadExample(key) {
    const ex = EXAMPLES[key];
    if (!ex) return;
    DOM.ingredientsInput.value = ex.ingredients;
    DOM.tasteSelect.value = ex.taste;
    DOM.timeSelect.value = ex.time;
    DOM.difficultySelect.value = ex.difficulty;
    AppState.ingredients = ex.ingredients;
    AppState.taste = ex.taste;
    AppState.time = ex.time;
    AppState.difficulty = ex.difficulty;
    showToast('info', '已填入食材', '点击"生成食谱"');
}

async function generateRecipe() {
    if (!AppState.ingredients.trim()) { showToast('warning', '请输入食材', ''); return; }

    DOM.recipeResult.classList.remove('hidden');
    DOM.recipeTitle.textContent = '正在生成...';
    DOM.recipeMeta.innerHTML = '';
    DOM.recipeContent.innerHTML = '';

    let content = '';
    AppState.currentRecipe = null;

    await AIService.generateRecipe(AppState.ingredients, {
        taste: AppState.taste,
        time: AppState.time,
        difficulty: AppState.difficulty,
        servings: AppState.servings
    },
        (text) => {
            content += text;
            DOM.recipeContent.innerHTML = formatMarkdown(content);
            // 提取标题
            const titleMatch = content.match(/^#\s+(.+)$/m);
            if (titleMatch) DOM.recipeTitle.textContent = titleMatch[1];
        },
        () => {
            AppState.currentRecipe = { title: DOM.recipeTitle.textContent, content, ingredients: AppState.ingredients };
            showToast('success', '食谱生成完成', '');
        },
        (e) => showToast('error', '生成失败', e.message)
    );
}

function formatMarkdown(text) {
    return text
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-orange-700 mt-4 mb-2">$1</h2>')
        .replace(/^# (.+)$/gm, '')
        .replace(/^\* (.+)$/gm, '<li>$1</li>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        .replace(/\n/g, '<br>');
}

async function saveCurrentRecipe() {
    if (!AppState.currentRecipe) { showToast('warning', '无内容保存', ''); return; }
    showLoading('保存中...');
    const result = await StorageService.saveRecipe(AppState.currentRecipe);
    hideLoading();
    if (result.success) {
        showToast('success', '已收藏', result.cloudSync ? '已同步云端' : '已保存本地');
        loadCollection();
    }
}

async function loadCollection() { AppState.recipes = await StorageService.getRecipes(); renderCollection(); }

function renderCollection() {
    if (AppState.recipes.length === 0) { DOM.collectionList.innerHTML = '<p class="text-gray-400 text-sm text-center">暂无收藏</p>'; return; }
    DOM.collectionList.innerHTML = AppState.recipes.map(r => `
        <div class="p-3 bg-orange-50 rounded-xl cursor-pointer hover:bg-orange-100 transition-all" data-id="${r.id}">
            <div class="font-medium text-gray-700">${r.title}</div>
            <div class="text-xs text-gray-400 mt-1">${new Date(r.createdAt).toLocaleDateString()}</div>
        </div>
    `).join('');
}

function closeCollection() { DOM.collectionPanel.classList.remove('open'); DOM.collectionOverlay.classList.add('hidden'); }

function loadSettings() { const c = AIService.getModelConfig() || {}; document.getElementById('api-url').value = c.apiUrl || ''; document.getElementById('api-key').value = c.apiKey || ''; document.getElementById('model-name').value = c.modelName || ''; }

function saveSettings() {
    const c = { apiUrl: document.getElementById('api-url').value.trim(), apiKey: document.getElementById('api-key').value.trim(), modelName: document.getElementById('model-name').value.trim() || 'GLM-4-Flash' };
    if (!c.apiUrl || !c.apiKey) { showToast('warning', '请填写完整', ''); return; }
    AIService.saveModelConfig(c);
    DOM.settingsModal.classList.remove('show');
    showToast('success', '配置已保存', '');
}

function showLoading(t) { DOM.loadingText.textContent = t; DOM.loadingOverlay.classList.add('show'); }
function hideLoading() { DOM.loadingOverlay.classList.remove('show'); }

function showToast(type, title, message) {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const colors = { success: 'bg-green-500', error: 'bg-red-500', warning: 'bg-yellow-500', info: 'bg-orange-500' };
    document.getElementById('toast-icon').className = `w-8 h-8 rounded-full flex items-center justify-center ${colors[type]}`;
    document.getElementById('toast-icon').textContent = icons[type];
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-message').textContent = message;
    DOM.toast.classList.remove('hidden');
    setTimeout(() => DOM.toast.classList.add('hidden'), 3000);
}

async function init() {
    initDOM();
    initEvents();
    await loadCollection();
    const config = await AIService.initConfig();
    if (!config) setTimeout(() => { DOM.settingsModal.classList.add('show'); showToast('info', '欢迎使用', '请配置 AI 模型'); }, 500);
}

document.addEventListener('DOMContentLoaded', init);
