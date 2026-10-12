import { type Data, xpBreakdown, XP_RULES } from "@/lib/model";
export function XpDetails({ data, date }: { data: Data; date: string }) {
  const ledger = xpBreakdown(data, date);
  return (
    <div className="xp-details">
      <p className="modal-description">
        {XP_RULES.version} · 실제 능력 점수가 아닌 기록 루틴의 보상입니다.
        10·50·100은 앱의 설계값이며 논문에서 정한 효과 수치가 아닙니다.
      </p>
      <ol className="xp-rules">
        <li>
          항목별 하루 첫 유효 기록 <strong>+{XP_RULES.perMetric} XP</strong>
        </li>
        <li>같은 항목을 같은 날 여러 번 기록해도 한 번만 보상</li>
        <li>
          측정은 유효한 숫자, 수량·시간·최고 기록은 0 초과, 체크는 완료가 유효
          기록
        </li>
        <li>
          하루 합계 <strong>최대 {XP_RULES.dailyCap} XP</strong> ·{" "}
          {XP_RULES.perLevel} XP마다 레벨 +1
        </li>
        <li>숫자를 더 크게 쓰거나 목표를 빨리 달성해도 추가 XP 없음</li>
        <li>
          수정·삭제·완료 취소 시 재계산 · 쉬었다고 차감하지 않음 · 과거 기록도
          같은 규칙
        </li>
      </ol>
      <h3>{date} 계산 내역</h3>
      <div className="xp-ledger">
        {ledger.rows.length ? (
          ledger.rows.map((row) => (
            <div key={row.id}>
              <span>
                {row.name}
                <small>
                  {row.count}개 기록 ·{" "}
                  {row.eligible ? "유효 기록 있음" : "보상 조건 미충족"}
                </small>
              </span>
              <strong>+{row.points} XP</strong>
            </div>
          ))
        ) : (
          <p className="form-hint">오늘 기록이 아직 없어요.</p>
        )}
        <div>
          <span>항목별 소계</span>
          <strong>{ledger.subtotal} XP</strong>
        </div>
        {ledger.capReduction > 0 && (
          <div>
            <span>하루 상한 적용</span>
            <strong>−{ledger.capReduction} XP</strong>
          </div>
        )}
        <div className="xp-total">
          <span>오늘의 XP</span>
          <strong>{ledger.total} XP</strong>
        </div>
      </div>
      <p className="form-hint">
        목표 진행률과 실제 수치 변화는 성장 분석에서 따로 확인하세요. 경험치는
        동기부여용이며 결과 개선을 증명하지 않습니다.
      </p>
    </div>
  );
}
