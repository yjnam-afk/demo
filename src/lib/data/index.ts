import 'server-only';
import { JsonTechRepository } from './jsonRepository';
import type { TechRepository } from './repository';

let instance: TechRepository | null = null;

/**
 * 저장소 진입점 — DB 전환은 여기 한 줄을 바꾸는 것으로 끝난다.
 * 페이지와 라우트는 구현체를 직접 import 하지 않는다.
 */
export function getRepo(): TechRepository {
  if (!instance) instance = new JsonTechRepository();
  return instance;
}

export type { TechPage, TechQuery, TechRepository } from './repository';
