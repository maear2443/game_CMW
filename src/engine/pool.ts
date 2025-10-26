/**
 * 오브젝트 풀링 시스템
 * 블럭과 이펙트의 생성/파괴를 최소화하여 성능 향상
 */

export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private initialSize: number;

  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize: number = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.initialSize = initialSize;

    // 초기 풀 생성
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  /**
   * 풀에서 객체 가져오기 (없으면 새로 생성)
   */
  acquire(): T {
    let obj: T;

    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      obj = this.createFn();
    }

    return obj;
  }

  /**
   * 객체를 풀에 반환
   */
  release(obj: T): void {
    this.resetFn(obj);
    this.pool.push(obj);
  }

  /**
   * 여러 객체를 한 번에 반환
   */
  releaseAll(objects: T[]): void {
    for (const obj of objects) {
      this.release(obj);
    }
  }

  /**
   * 풀 크기 확인
   */
  size(): number {
    return this.pool.length;
  }

  /**
   * 풀 초기화
   */
  clear(): void {
    this.pool = [];
    for (let i = 0; i < this.initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }
}

/**
 * 간단한 풀 관리자 (전역)
 */
export class PoolManager {
  private static pools = new Map<string, ObjectPool<any>>();

  static register<T>(name: string, pool: ObjectPool<T>): void {
    this.pools.set(name, pool);
  }

  static get<T>(name: string): ObjectPool<T> | undefined {
    return this.pools.get(name);
  }

  static clearAll(): void {
    this.pools.forEach((pool) => pool.clear());
  }
}
