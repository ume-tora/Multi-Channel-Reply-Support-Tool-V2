/**
 * 🎨 ドラッグ&ドロップ機能マネージャー
 * AIボタンを全サービスで自由に移動可能にする
 */

export interface DragDropOptions {
  /** ドラッグ可能範囲を制限 */
  constrainToViewport?: boolean;
  /** ドラッグ中の透明度 */
  dragOpacity?: number;
  /** スナップ機能（グリッドに吸着） */
  snapToGrid?: boolean;
  /** グリッドサイズ */
  gridSize?: number;
  /** 位置保存キー */
  storageKey?: string;
}

export interface DragPosition {
  x: number;
  y: number;
}

export class DragDropManager {
  private element: HTMLElement;
  private options: Required<DragDropOptions>;
  private isDragging = false;
  private startPos = { x: 0, y: 0 };
  private elementOffset = { x: 0, y: 0 };
  private originalPosition: DragPosition;
  private dragHandle: HTMLElement | null = null;
  private hasMoved = false;
  private readonly DRAG_THRESHOLD = 5; // 5px移動でドラッグ開始

  constructor(element: HTMLElement, options: DragDropOptions = {}) {
    this.element = element;
    this.options = {
      constrainToViewport: options.constrainToViewport ?? true,
      dragOpacity: options.dragOpacity ?? 0.8,
      snapToGrid: options.snapToGrid ?? false,
      gridSize: options.gridSize ?? 20,
      storageKey: options.storageKey ?? 'ai-button-position'
    };

    this.originalPosition = this.getCurrentPosition();
    this.init();
  }

  private init(): void {
    // 保存された位置を復元
    this.restorePosition();
    
    // ドラッグ可能にする
    this.makeDraggable();
    
    // スタイル調整
    this.setupDragStyles();
  }

  private setupDragStyles(): void {
    this.element.style.cursor = 'grab';
    this.element.style.userSelect = 'none';
    this.element.style.position = 'fixed';
    
    // ドラッグハンドルアイコンを追加
    this.addDragHandle();
  }

  private addDragHandle(): void {
    const handle = document.createElement('div');
    handle.innerHTML = '⋮⋮';
    handle.className = 'drag-handle';
    handle.style.cssText = `
      position: absolute !important;
      top: -2px !important;
      left: -2px !important;
      width: 12px !important;
      height: 12px !important;
      background: rgba(0, 0, 0, 0.6) !important;
      color: white !important;
      font-size: 8px !important;
      line-height: 6px !important;
      text-align: center !important;
      border-radius: 3px !important;
      cursor: grab !important;
      z-index: 1 !important;
      opacity: 0.7 !important;
      transition: opacity 0.2s ease !important;
    `;
    
    handle.addEventListener('mouseenter', () => {
      handle.style.opacity = '1';
    });
    
    handle.addEventListener('mouseleave', () => {
      handle.style.opacity = '0.7';
    });
    
    this.dragHandle = handle;
    this.element.appendChild(handle);
  }

  private makeDraggable(): void {
    // 要素全体でドラッグ可能にするが、クリックとの競合を回避
    this.element.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    // タッチイベント対応
    this.element.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return; // 左クリックのみ
    
    // ドラッグハンドルがクリックされた場合のみ即座にドラッグ開始
    if (this.dragHandle && (e.target === this.dragHandle || this.dragHandle.contains(e.target as Node))) {
      this.startDrag(e.clientX, e.clientY);
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // ボタン本体の場合は、移動距離で判断するために座標だけ記録
    this.startPos = { x: e.clientX, y: e.clientY };
    this.hasMoved = false;
    
    const rect = this.element.getBoundingClientRect();
    this.elementOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    
    // タッチの場合も同様の処理
    if (this.dragHandle && (e.target === this.dragHandle || this.dragHandle.contains(e.target as Node))) {
      this.startDrag(touch.clientX, touch.clientY);
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    this.startPos = { x: touch.clientX, y: touch.clientY };
    this.hasMoved = false;
    
    const rect = this.element.getBoundingClientRect();
    this.elementOffset = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  private startDrag(clientX: number, clientY: number): void {
    this.isDragging = true;
    this.hasMoved = true;
    
    // elementOffsetが設定されていない場合は計算
    if (this.elementOffset.x === 0 && this.elementOffset.y === 0) {
      const rect = this.element.getBoundingClientRect();
      this.elementOffset = {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    // ドラッグ開始スタイル
    this.element.style.opacity = this.options.dragOpacity.toString();
    this.element.style.cursor = 'grabbing';
    this.element.style.zIndex = '999999';
    this.element.style.transform = 'scale(1.05)';
    this.element.style.transition = 'transform 0.1s ease';

    console.log('🎯 Drag started');
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      this.updatePosition(e.clientX, e.clientY);
      return;
    }
    
    // ドラッグが開始されていない場合、移動距離をチェック
    if (this.startPos.x !== 0 || this.startPos.y !== 0) {
      const deltaX = Math.abs(e.clientX - this.startPos.x);
      const deltaY = Math.abs(e.clientY - this.startPos.y);
      
      if (deltaX > this.DRAG_THRESHOLD || deltaY > this.DRAG_THRESHOLD) {
        this.hasMoved = true;
        this.startDrag(e.clientX, e.clientY);
      }
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    
    if (this.isDragging) {
      this.updatePosition(touch.clientX, touch.clientY);
      e.preventDefault();
      return;
    }
    
    // ドラッグが開始されていない場合、移動距離をチェック
    if (this.startPos.x !== 0 || this.startPos.y !== 0) {
      const deltaX = Math.abs(touch.clientX - this.startPos.x);
      const deltaY = Math.abs(touch.clientY - this.startPos.y);
      
      if (deltaX > this.DRAG_THRESHOLD || deltaY > this.DRAG_THRESHOLD) {
        this.hasMoved = true;
        this.startDrag(touch.clientX, touch.clientY);
        e.preventDefault();
      }
    }
  }

  private updatePosition(clientX: number, clientY: number): void {
    let newX = clientX - this.elementOffset.x;
    let newY = clientY - this.elementOffset.y;

    // ビューポート制限
    if (this.options.constrainToViewport) {
      const rect = this.element.getBoundingClientRect();
      newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
      newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));
    }

    // グリッドスナップ
    if (this.options.snapToGrid) {
      newX = Math.round(newX / this.options.gridSize) * this.options.gridSize;
      newY = Math.round(newY / this.options.gridSize) * this.options.gridSize;
    }

    this.element.style.left = `${newX}px`;
    this.element.style.top = `${newY}px`;
  }

  private onMouseUp(e: MouseEvent): void {
    if (this.isDragging) {
      this.endDrag();
    } else {
      // ドラッグされていない場合は、座標をリセット
      this.startPos = { x: 0, y: 0 };
      this.hasMoved = false;
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    if (this.isDragging) {
      this.endDrag();
    } else {
      // ドラッグされていない場合は、座標をリセット
      this.startPos = { x: 0, y: 0 };
      this.hasMoved = false;
    }
  }

  private endDrag(): void {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    this.startPos = { x: 0, y: 0 };
    this.elementOffset = { x: 0, y: 0 };
    
    // ドラッグ終了スタイル
    this.element.style.opacity = '1';
    this.element.style.cursor = 'grab';
    this.element.style.transform = 'scale(1)';
    this.element.style.transition = 'transform 0.2s ease';

    // 位置を保存
    this.savePosition();
    
    // hasMovedは保持し、次のクリックでリセットされる
    
    console.log('🎯 Drag ended, position saved');
  }

  private getCurrentPosition(): DragPosition {
    const rect = this.element.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
  }

  private savePosition(): void {
    try {
      const position = this.getCurrentPosition();
      localStorage.setItem(this.options.storageKey, JSON.stringify(position));
    } catch (error) {
      console.warn('DragDropManager: Failed to save position:', error);
    }
  }

  private restorePosition(): void {
    try {
      const saved = localStorage.getItem(this.options.storageKey);
      if (saved) {
        const position: DragPosition = JSON.parse(saved);
        
        // 位置が有効範囲内かチェック
        if (this.isValidPosition(position)) {
          this.element.style.left = `${position.x}px`;
          this.element.style.top = `${position.y}px`;
          console.log('🎯 Position restored:', position);
        } else {
          console.log('🎯 Saved position invalid, using default');
        }
      }
    } catch (error) {
      console.warn('DragDropManager: Failed to restore position:', error);
    }
  }

  private isValidPosition(position: DragPosition): boolean {
    return position.x >= 0 && 
           position.y >= 0 && 
           position.x < window.innerWidth && 
           position.y < window.innerHeight;
  }

  /**
   * 位置をリセット
   */
  public resetPosition(): void {
    this.element.style.left = `${this.originalPosition.x}px`;
    this.element.style.top = `${this.originalPosition.y}px`;
    this.savePosition();
    console.log('🎯 Position reset to original');
  }

  /**
   * ドラッグ機能を有効/無効切り替え
   */
  public setEnabled(enabled: boolean): void {
    this.element.style.cursor = enabled ? 'grab' : 'default';
    this.element.style.pointerEvents = enabled ? 'auto' : 'none';
  }

  /**
   * ドラッグで移動したかどうかを確認
   * クリックイベントで呼び出して使用
   */
  public didMove(): boolean {
    return this.hasMoved;
  }
  
  /**
   * ムーブフラグをリセット
   * クリックイベント処理後に呼び出し
   */
  public resetMoveFlag(): void {
    this.hasMoved = false;
  }
  
  /**
   * ドラッグ中かどうかを確認
   */
  public isDraggingNow(): boolean {
    return this.isDragging;
  }
  
  /**
   * クリーンアップ
   */
  public destroy(): void {
    // イベントリスナーは自動的にガベージコレクションされる
    console.log('🎯 DragDropManager destroyed');
  }
}