import type { Metric } from "./model";
export type EvidenceSource = {
  id: string;
  title: string;
  authors: string;
  year: number;
  kind: "guideline" | "review" | "meta-analysis" | "observational" | "book";
  url: string;
  verification: string;
  summary: string;
  limits: string;
};
export const evidenceSources: EvidenceSource[] = [
  {
    id: "who",
    verification: "2026-10-12 · 공식 안내·공개 전체 내용 확인",
    title: "WHO guidelines on physical activity and sedentary behaviour",
    authors: "Bull et al.",
    year: 2020,
    kind: "guideline",
    url: "https://doi.org/10.1136/bjsports-2020-102955",
    summary:
      "성인은 주 150–300분 중강도 또는 75–150분 고강도 유산소 활동과 주 2일 이상의 근력 활동을 권고받습니다.",
    limits:
      "일반 지침입니다. 여기의 10분 걷기는 시작용 예시이며 권고 운동량 충족을 의미하지 않습니다.",
  },
  {
    id: "learning",
    verification: "2026-10-12 · 논문 정보·요약 확인, 전체 내용 미확인",
    title: "Improving Students’ Learning With Effective Learning Techniques",
    authors: "Dunlosky et al.",
    year: 2013,
    kind: "review",
    url: "https://doi.org/10.1177/1529100612453266",
    summary:
      "배운 내용을 보지 않고 떠올리는 연습과 며칠 간격으로 반복하는 학습은 여러 학습 조건에서 유용성이 높게 평가되었습니다.",
    limits:
      "학습 내용과 연습 방법에 따라 효과가 달라집니다. 단순 독서 시간만으로 학습 효과를 판정하지 않습니다.",
  },
  {
    id: "planning",
    verification: "2026-10-12 · 논문 정보 확인, 요약·전체 내용 미확인",
    title: "Implementation Intentions and Goal Achievement",
    authors: "Gollwitzer & Sheeran",
    year: 2006,
    kind: "meta-analysis",
    url: "https://doi.org/10.1016/S0065-2601(06)38002-1",
    summary:
      "언제·어디서·무엇을 할지 구체적으로 정하는 계획은 목표 수행을 돕는 전략으로 연구되었습니다.",
    limits:
      "계획만 세우는 것과 실제 수행은 다릅니다. 메모에 구체적인 다음 행동을 적어보세요.",
  },
  {
    id: "monitoring",
    verification: "2026-10-12 · 논문 정보·요약 확인, 전체 내용 미확인",
    title: "Does monitoring goal progress promote goal attainment?",
    authors: "Harkin et al.",
    year: 2016,
    kind: "meta-analysis",
    url: "https://doi.org/10.1037/bul0000025",
    summary:
      "138개 무작위 배정 연구에서 진행 상황을 점검하도록 돕는 방법은 평균적으로 목표 달성을 도왔습니다. 실제 결과를 기록하는 방식이 중요합니다.",
    limits:
      "앱의 XP 숫자는 연구에서 정한 효과 점수가 아닙니다. 기록과 실제 결과를 함께 확인하세요.",
  },
  {
    id: "mindfulness",
    verification: "2026-10-12 · 논문 정보·요약 확인, 전체 내용 조회 오류",
    title: "Meditation Programs for Psychological Stress and Well-being",
    authors: "Goyal et al.",
    year: 2014,
    kind: "review",
    url: "https://doi.org/10.1001/jamainternmed.2013.13018",
    summary:
      "47개 시험을 종합해 정해진 과정에 따라 호흡과 현재의 감각에 집중하는 명상 프로그램의 불안·우울·통증 개선에 중간 수준의 근거를 보고했습니다.",
    limits:
      "주의력·수면·체중 개선 근거는 부족하거나 불확실했습니다. 연구 프로그램과 3분 호흡 연습은 다르며 동일 효과를 보장하지 않습니다.",
  },
  {
    id: "sleep",
    verification: "2026-10-12 · 논문 정보·요약 확인, 권고 본문 미확인",
    title: "Recommended Amount of Sleep for a Healthy Adult",
    authors: "Watson et al.",
    year: 2015,
    kind: "guideline",
    url: "https://doi.org/10.5665/sleep.4716",
    summary:
      "성인 수면 시간에 대한 학회 공동 권고는 규칙적으로 7시간 이상 자는 것을 제안합니다.",
    limits:
      "수면 준비 체크 자체의 효과를 입증한 연구는 아닙니다. 개인의 수면 필요와 생활 조건을 고려하세요.",
  },
  {
    id: "connection",
    verification: "2026-10-12 · 논문 정보·요약·공개 전체 내용 확인",
    title: "Social Relationships and Mortality Risk: A Meta-analytic Review",
    authors: "Holt-Lunstad et al.",
    year: 2010,
    kind: "observational",
    url: "https://doi.org/10.1371/journal.pmed.1000316",
    summary: "사회적 관계와 건강 결과 사이의 연관성이 보고되었습니다.",
    limits:
      "관찰 연구 중심입니다. 주 2회 안부 연락이라는 예시가 같은 효과를 일으킨다는 인과 근거는 아닙니다.",
  },
  {
    id: "habits",
    verification: "소개 페이지 접근 차단 · 책 본문 미확인",
    title: "Atomic Habits",
    authors: "James Clear",
    year: 2018,
    kind: "book",
    url: "https://jamesclear.com/atomic-habits",
    summary:
      "작게 시작하기, 환경 단서 만들기, 진행 상황 확인 같은 실천 아이디어를 제공합니다.",
    limits:
      "실용서의 조언과 실험적 효과 검증을 구분합니다. 모든 사람에게 정해진 기간에 습관이 생기지는 않습니다.",
  },
];
export const practiceCategories = [
  { id: "mind", name: "마음", color: "#9970bc" },
  { id: "recovery", name: "회복", color: "#508fa5" },
  { id: "relations", name: "관계", color: "#b87993" },
  { id: "execution", name: "실행", color: "#a98b46" },
];
export type Practice = {
  id: string;
  name: string;
  categoryId: string;
  kind: Metric["kind"];
  unit: string;
  goal: number;
  sourceId: string;
  instruction: string;
  starter: string;
};
export const practices: Practice[] = [
  {
    id: "walk",
    name: "걷기",
    categoryId: "exercise",
    kind: "time",
    unit: "분",
    goal: 70,
    sourceId: "who",
    instruction:
      "편한 강도로 짧게 걷고 시간을 기록하세요. 자신의 상황에 맞게 점차 늘려보세요.",
    starter: "시작 예시: 10분 · 주 70분",
  },
  {
    id: "strength",
    name: "근력 운동",
    categoryId: "exercise",
    kind: "check",
    unit: "일",
    goal: 2,
    sourceId: "who",
    instruction:
      "자신에게 맞는 근력 운동을 한 날에 체크하세요. 푸시업 최고 기록은 별도로 추적할 수 있어요.",
    starter: "시작 예시: 주 2일",
  },
  {
    id: "retrieval",
    name: "배운 내용 떠올리기",
    categoryId: "learn",
    kind: "time",
    unit: "분",
    goal: 40,
    sourceId: "learning",
    instruction:
      "책이나 노트를 덮고 배운 핵심을 떠올린 뒤 확인하세요. 며칠 뒤 다시 연습해보세요.",
    starter: "시작 예시: 10분 · 주 40분",
  },
  {
    id: "sleep-prep",
    name: "수면 준비",
    categoryId: "recovery",
    kind: "check",
    unit: "일",
    goal: 5,
    sourceId: "sleep",
    instruction:
      "잠자리에 들 시간을 미리 정하고 준비한 날을 체크하세요. 실제 수면 시간은 별도 측정 항목으로 기록할 수 있어요.",
    starter: "시작 예시: 주 5일",
  },
  {
    id: "mindful-pause",
    name: "호흡에 집중하며 쉬기",
    categoryId: "mind",
    kind: "time",
    unit: "분",
    goal: 15,
    sourceId: "mindfulness",
    instruction:
      "짧게 멈추고 호흡이나 감각에 주의를 기울여보세요. 편안한 시간만큼 기록하세요.",
    starter: "시작 예시: 3분 · 주 15분",
  },
  {
    id: "connection",
    name: "가까운 사람에게 안부 묻기",
    categoryId: "relations",
    kind: "check",
    unit: "일",
    goal: 2,
    sourceId: "connection",
    instruction:
      "편한 사람과 안부를 나누거나 함께한 날을 체크하세요. 횟수보다 관계의 질을 돌아보세요.",
    starter: "시작 예시: 주 2일",
  },
  {
    id: "next-action",
    name: "다음에 할 일 정하기",
    categoryId: "execution",
    kind: "check",
    unit: "일",
    goal: 3,
    sourceId: "planning",
    instruction:
      "“어떤 상황이 되면, 어디서 무엇을 하겠다”라는 조건과 행동을 한 문장으로 정해 메모에 적어보세요. 실행 여부도 돌아보세요.",
    starter: "시작 예시: 주 3일",
  },
  {
    id: "weekly-review",
    name: "주간 돌아보기",
    categoryId: "execution",
    kind: "check",
    unit: "일",
    goal: 1,
    sourceId: "monitoring",
    instruction:
      "한 주의 기록과 실제 변화를 보고 다음 주에 할 작은 행동 하나를 고르세요.",
    starter: "시작 예시: 주 1일",
  },
];
export const recommendedStart = ["walk", "retrieval", "next-action"];
export function practiceMetric(p: Practice): Omit<Metric, "id"> {
  return {
    name: p.name,
    kind: p.kind,
    unit: p.unit,
    direction: p.kind === "check" ? "none" : "up",
    categoryId: p.categoryId,
    goal: p.goal,
    pinned: false,
    archived: false,
    practiceId: p.id,
  };
}
