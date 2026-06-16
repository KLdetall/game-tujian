/**
 * IndexedDB wrapper for image storage
 * Database: GameImageDB
 * Store: images — keyed by auto-increment id
 * Each image: { id, game, category, tag, data (base64), name, addedAt }
 */
const DB_NAME = 'GameImageDB';
const DB_VERSION = 1;
const STORE_NAME = 'images';
const MAX_CANDIDATE = 100;
const MAX_CATEGORY = 20;

class ImageDB {
  constructor() {
    this.db = null;
  }

  async open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('game', 'game', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('tag', 'tag', { unique: false });
        }
      };
      req.onsuccess = (e) => { this.db = e.target.result; resolve(); };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async addImage(game, data, name) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const img = { game, category: '__candidate__', tag: null, data, name, addedAt: Date.now() };
      const req = store.add(img);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getImagesByGame(game) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.index('game').getAll(game);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async updateCategory(id, category) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const img = getReq.result;
        if (img) {
          img.category = category;
          store.put(img).onsuccess = () => resolve();
        } else { reject('not found'); }
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async updateTag(id, tag) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const img = getReq.result;
        if (img) {
          img.tag = tag;
          store.put(img).onsuccess = () => resolve();
        } else { reject('not found'); }
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async removeImage(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getCategoryCount(game, category) {
    const imgs = await this.getImagesByGame(game);
    return imgs.filter(i => i.category === category).length;
  }

  async isCandidateFull(game) {
    const count = await this.getCategoryCount(game, '__candidate__');
    return count >= MAX_CANDIDATE;
  }

  async isCategoryFull(game, category) {
    const count = await this.getCategoryCount(game, category);
    return count >= MAX_CATEGORY;
  }

  async clearGameData(game) {
    const imgs = await this.getImagesByGame(game);
    const tx = this.db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    imgs.forEach(img => store.delete(img.id));
    return new Promise(resolve => { tx.oncomplete = resolve; });
  }
}

const imageDB = new ImageDB();
