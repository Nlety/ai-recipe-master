/**
 * AI 服务 - 食谱生成
 */
const CONFIG_KEY = 'ai_recipe_config';
const REMOTE_CONFIG_URL = 'https://ai-pages.dc616fa1.er.aliyun-esa.net/api/storage?key=config';
const DECRYPT_KEY = 'shfn73fnein348un';

function decryptConfig(e) { try { const d = CryptoJS.RC4.decrypt(e, DECRYPT_KEY).toString(CryptoJS.enc.Utf8); if (!d) return null; const c = JSON.parse(d); c.modelName = 'GLM-4-Flash'; return c; } catch (e) { return null; } }
async function fetchRemoteConfig() { try { const r = await fetch(REMOTE_CONFIG_URL); if (!r.ok) return null; const d = await r.json(); if (d && d.value) { const c = decryptConfig(d.value); if (c && c.apiUrl && c.apiKey) { localStorage.setItem(CONFIG_KEY + '_remote', JSON.stringify(c)); return c; } } return null; } catch (e) { return null; } }
function getModelConfig() { try { const u = localStorage.getItem(CONFIG_KEY); if (u) { const p = JSON.parse(u); if (p && p.apiUrl && p.apiKey && p.modelName) return p; } const r = localStorage.getItem(CONFIG_KEY + '_remote'); if (r) return JSON.parse(r); return null; } catch (e) { return null; } }
function saveModelConfig(c) { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); }
async function initConfig() { const c = getModelConfig(); if (c) return c; return await fetchRemoteConfig(); }
async function hasAvailableConfig() { const c = getModelConfig(); if (c && c.apiUrl && c.apiKey) return true; const r = await fetchRemoteConfig(); return !!(r && r.apiUrl && r.apiKey); }

async function generateRecipe(ingredients, options, onMessage, onComplete, onError) {
    let config = getModelConfig();
    if (!config || !config.apiUrl || !config.apiKey) config = await fetchRemoteConfig();
    if (!config || !config.apiUrl || !config.apiKey || !config.modelName) { onError(new Error('请先配置模型')); return { abort: () => { } }; }

    const tasteMap = { light: '清淡', spicy: '香辣', sweet: '酸甜', salty: '咸香' };
    const diffMap = { easy: '简单', medium: '中等', hard: '复杂' };

    let prompt = `你是一位专业的中餐厨师，请根据以下食材推荐一道菜品并提供详细食谱：

食材：${ingredients}
份量：${options.servings}人份`;

    if (options.taste) prompt += `\n口味偏好：${tasteMap[options.taste]}`;
    if (options.time) prompt += `\n烹饪时间：${options.time}分钟以内`;
    if (options.difficulty) prompt += `\n难度要求：${diffMap[options.difficulty]}`;

    prompt += `

请按以下格式输出：
# 菜名

## 📝 简介
（简单介绍这道菜）

## 🥘 食材清单
（列出所有需要的食材和用量）

## 👨‍🍳 烹饪步骤
（详细的分步骤说明）

## 💡 小贴士
（烹饪技巧和注意事项）

## 🔥 营养信息
（大致的热量和营养成分）`;

    const controller = new AbortController();
    try {
        const response = await fetch(`${config.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
            body: JSON.stringify({ model: config.modelName, messages: [{ role: 'user', content: prompt }], stream: true, temperature: 0.8 }),
            signal: controller.signal
        });
        if (!response.ok) throw new Error(`请求失败: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) { onComplete(); break; }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') { onComplete(); return; }
                    try { const content = JSON.parse(data).choices?.[0]?.delta?.content; if (content) onMessage(content); } catch (e) { }
                }
            }
        }
    } catch (error) { if (error.name !== 'AbortError') onError(error); }
    return { abort: () => controller.abort() };
}

window.AIService = { getModelConfig, saveModelConfig, initConfig, hasAvailableConfig, generateRecipe };
