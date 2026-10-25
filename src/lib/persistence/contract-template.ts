import { CONTRACT_DEFAULTS } from '#lib/domain/defaults.ts';

/**
 * contract.yaml の雛形（SPEC.md §4.1 / §4.5）。
 *
 * アプリからは書き出さない。画面に表示し、利用者が自分でファイルを作る。氏名・
 * 客先名には既定値がなく、雛形を置いても結局は手で埋めることになる。
 */
export const CONTRACT_TEMPLATE = `# 契約設定。このファイルはアプリから書き換えません
workerName: 山田 太郎          # 氏名・屋号
clientName: 株式会社サンプル
lowerHours: ${CONTRACT_DEFAULTS.lowerHours}               # 精算幅の下限
upperHours: ${CONTRACT_DEFAULTS.upperHours}               # 精算幅の上限
dailyHours: ${CONTRACT_DEFAULTS.dailyHours}                 # 1 日の想定稼働時間
maxEndTime: "${CONTRACT_DEFAULTS.maxEndTime}"          # 終了時刻の上限（24:00〜47:59）
`;
