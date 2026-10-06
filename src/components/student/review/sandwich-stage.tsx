// Illustration and geometry from Algorithm Studio bc8d51f; state comes from the existing replay engine.
import type { initialSandwich, reviewSandwich } from "@/lib/classroom/review/sandwich-engine.mjs";
export function SandwichStage({state, review, error, action}: {state: ReturnType<typeof initialSandwich>; review: ReturnType<typeof reviewSandwich>; error: boolean; action?: string}) {
  const knife = !error && action?.startsWith("SPREAD_") ? `translate(${action.includes("BREAD2") ? 540 : 350},${action.endsWith("EDGE") ? 235 : 270}) rotate(15)` : state.knifeHolding === "jam" ? "translate(800,240) rotate(-15)" : state.knifeHolding === "pb" ? "translate(700,240) rotate(-15)" : "translate(905,290) rotate(-25)";
  return <svg viewBox="0 40 980 410" role="img" aria-label={`접시에 빵 ${state.breadOnPlate}장. ${state.completed ? review.title : "아직 조립 중"}`}>
                <rect x="20" y="295" width="940" height="145" rx="16" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="4"/>
                <rect x="20" y="295" width="940" height="24" fill="#e2e8f0" opacity="0.6"/>


                <g transform="translate(45, 155)">
                  <rect x="0" y="20" width="105" height="125" rx="12" fill="#bae6fd" stroke="#38bdf8" strokeWidth="3" opacity="0.85"/>
                  <text x="52" y="80" fill="#0369a1" fontSize="13" fontWeight="900" textAnchor="middle">식빵 봉지</text>
                  <text x="52" y="108" fill="#0284c7" fontSize="11" fontWeight="bold" textAnchor="middle">{state.bagOpened ? "[개봉됨]" : "[밀봉됨]"}</text>
                  <g data-part="bag-clip" transform={state.bagOpened ? "translate(0, -45) rotate(-45)" : undefined}>
                    <rect x="32" y="6" width="40" height="18" rx="4" fill="#ef4444" stroke="#b91c1c" strokeWidth="2"/>
                  </g>
                </g>


                <g transform="translate(165, 200)">
                  <rect x="0" y="20" width="85" height="85" rx="8" fill="#fef08a" stroke="#eab308" strokeWidth="3"/>
                  <text x="42" y="60" fill="#a16207" fontSize="12" fontWeight="900" textAnchor="middle">체다 치즈</text>
                  <text x="42" y="82" fill="#ca8a04" fontSize="10" fontWeight="bold" textAnchor="middle">{state.cheeseUnwrapped ? "[비닐제거됨]" : "[비닐밀봉]"}</text>
                  <rect data-part="cheese-plastic" transform={state.cheeseUnwrapped ? "translate(0,-50)" : undefined} x="6" y="26" width="73" height="73" rx="4" fill="#38bdf8" opacity="0.35" stroke="#0284c7" strokeDasharray="3,3"/>
                </g>


                <g transform="translate(265, 220)">
                  <ellipse cx="225" cy="88" rx="205" ry="40" fill="#ffffff" stroke="#cbd5e1" strokeWidth="5"/>
                  <ellipse cx="225" cy="86" rx="175" ry="30" fill="#f1f5f9"/>


                  <g data-part="bread-1" opacity={state.breadOnPlate >= 1 ? 1 : 0} transform={state.breadOnPlate >= 1 ? "translate(75,20)" : "translate(75,-120)"}>
                    <path d="M 0 20 C 0 -15, 105 -15, 105 20 L 100 68 L 5 68 Z" fill="#fed7aa" stroke="#ea580c" strokeWidth="3"/>
                    <path data-part="jam-edge-1" style={{ opacity: state.bread1Spread === "jam_edge" ? 1 : 0 }} d="M 0 20 C 0 -15, 105 -15, 105 20 L 102 10 C 102 -20, 3 -20, 3 10 Z" fill="#dc2626"/>
                    <path data-part="pb-edge-1" style={{ opacity: state.bread1Spread === "pb_edge" ? 1 : 0 }} d="M 0 20 C 0 -15, 105 -15, 105 20 L 102 10 C 102 -20, 3 -20, 3 10 Z" fill="#b45309"/>
                    <path data-part="jam-flat-1" style={{ opacity: state.bread1Spread === "jam_flat" ? 1 : 0 }} d="M 12 22 C 12 0, 93 0, 93 22 L 88 56 L 17 56 Z" fill="#dc2626" opacity="0.95"/>
                    <path data-part="pb-flat-1" style={{ opacity: state.bread1Spread === "pb_flat" ? 1 : 0 }} d="M 12 22 C 12 0, 93 0, 93 22 L 88 56 L 17 56 Z" fill="#b45309" opacity="0.95"/>

                    <g data-part="cheese-on-bread-1" opacity={state.cheeseOnBread === 1 ? 1 : 0} transform="translate(18, 15)">
                      <rect x="0" y="0" width="70" height="48" rx="4" fill="#facc15" stroke="#ca8a04" strokeWidth="2"/>
                      <g data-part="cheese-error-wrap-1" opacity={state.cheesePlasticIncluded ? 1 : 0}>
                        <rect x="-3" y="-3" width="76" height="54" rx="6" fill="#0284c7" opacity="0.4" stroke="#0369a1" strokeWidth="2"/>
                        <text x="35" y="28" fill="#ffffff" fontSize="9" fontWeight="900" textAnchor="middle">⚠️비닐포장째</text>
                      </g>
                    </g>
                    <text x="52" y="82" fill="#9a3412" fontSize="10" fontWeight="bold" textAnchor="middle">식빵 1 (왼쪽)</text>
                  </g>


                  <g data-part="bread-2" opacity={state.breadOnPlate >= 2 ? 1 : 0} transform={state.completed ? "translate(75,15)" : state.breadOnPlate >= 2 ? "translate(265,20)" : "translate(265,-120)"}>
                    <path d="M 0 20 C 0 -15, 105 -15, 105 20 L 100 68 L 5 68 Z" fill="#fdba74" stroke="#c2410c" strokeWidth="3"/>
                    <path data-part="jam-edge-2" style={{ opacity: state.bread2Spread === "jam_edge" && !(state.completed && state.isFlippedCover) ? 1 : 0 }} d="M 0 20 C 0 -15, 105 -15, 105 20 L 102 10 C 102 -20, 3 -20, 3 10 Z" fill="#dc2626"/>
                    <path data-part="pb-edge-2" style={{ opacity: state.bread2Spread === "pb_edge" && !(state.completed && state.isFlippedCover) ? 1 : 0 }} d="M 0 20 C 0 -15, 105 -15, 105 20 L 102 10 C 102 -20, 3 -20, 3 10 Z" fill="#b45309"/>
                    <path data-part="pb-flat-2" style={{ opacity: state.bread2Spread === "pb_flat" && !(state.completed && state.isFlippedCover) ? 1 : 0 }} d="M 12 22 C 12 0, 93 0, 93 22 L 88 56 L 17 56 Z" fill="#b45309" opacity="0.95"/>
                    <path data-part="jam-flat-2" style={{ opacity: state.bread2Spread === "jam_flat" && !(state.completed && state.isFlippedCover) ? 1 : 0 }} d="M 12 22 C 12 0, 93 0, 93 22 L 88 56 L 17 56 Z" fill="#dc2626" opacity="0.95"/>

                    <g data-part="cheese-on-bread-2" opacity={state.cheeseOnBread === 2 && !(state.completed && state.isFlippedCover) ? 1 : 0} transform="translate(18, 15)">
                      <rect x="0" y="0" width="70" height="48" rx="4" fill="#facc15" stroke="#ca8a04" strokeWidth="2"/>
                      <g data-part="cheese-error-wrap-2" opacity={state.cheesePlasticIncluded ? 1 : 0}>
                        <rect x="-3" y="-3" width="76" height="54" rx="6" fill="#0284c7" opacity="0.4" stroke="#0369a1" strokeWidth="2"/>
                        <text x="35" y="28" fill="#ffffff" fontSize="9" fontWeight="900" textAnchor="middle">⚠️비닐포장째</text>
                      </g>
                    </g>
                    <text x="52" y="82" fill="#9a3412" fontSize="10" fontWeight="bold" textAnchor="middle">{state.completed ? "" : "식빵 2 (오른쪽)"}</text>
                  </g>


                  <g data-part="complete-badge" opacity={state.completed ? 1 : 0} transform="translate(130, -35)">
                    <text x="0" y="0" fontSize="32" textAnchor="middle">✨🥪✨</text>
                    <rect x={-Math.max(180,review.title.length*14+30)/2} y="8" width={Math.max(180,review.title.length*14+30)} height="26" rx="13" fill={review.badgeType === "perfect" ? "#10b981" : "#f59e0b"}/>
                    <text x="0" y="25" fill="#ffffff" fontSize="11" fontWeight="900" textAnchor="middle">{review.title}</text>
                  </g>
                </g>


                <g transform="translate(710, 175)">
                  <rect x="10" y="25" width="70" height="95" rx="10" fill="#fef3c7" stroke="#d97706" strokeWidth="3"/>
                  <rect x="18" y="35" width="54" height="75" rx="6" fill="#b45309"/>
                  <text x="45" y="72" fill="#ffffff" fontSize="12" fontWeight="900" textAnchor="middle">땅콩버터</text>
                  <text x="45" y="93" fill="#fde68a" fontSize="9" fontWeight="bold" textAnchor="middle">{state.pbOpened ? "[열림]" : "[뚜껑닫힘]"}</text>
                  <g data-part="pb-lid" transform={state.pbOpened ? "translate(-35,-45) rotate(-40)" : undefined}>
                    <rect x="6" y="10" width="78" height="18" rx="4" fill="#92400e" stroke="#78350f" strokeWidth="2"/>
                  </g>
                </g>


                <g transform="translate(805, 160)">
                  <rect x="12" y="30" width="75" height="105" rx="12" fill="#fee2e2" stroke="#f87171" strokeWidth="3"/>
                  <rect x="20" y="40" width="59" height="85" rx="6" fill="#ef4444"/>
                  <text x="50" y="82" fill="#ffffff" fontSize="13" fontWeight="900" textAnchor="middle">딸기잼</text>
                  <text x="50" y="104" fill="#fecaca" fontSize="9" fontWeight="bold" textAnchor="middle">{state.jamOpened ? "[열림]" : "[뚜껑닫힘]"}</text>
                  <g data-part="jam-lid" transform={state.jamOpened ? "translate(45,-45) rotate(45)" : undefined}>
                    <rect x="8" y="15" width="83" height="18" rx="5" fill="#facc15" stroke="#ca8a04" strokeWidth="2"/>
                  </g>
                </g>


                <g data-part="knife" transform={knife}>
                  <rect x="0" y="0" width="13" height="42" rx="4" fill="#475569"/>
                  <path d="M 0 -60 L 13 -60 L 13 0 L 0 0 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2"/>
                  <circle data-part="knife-blob" style={{ opacity: state.knifeHolding !== "none" ? 1 : 0, fill: state.knifeHolding === "pb" ? "#b45309" : "#dc2626" }} cx="6.5" cy="-48" r="7.5" fill="#dc2626"/>
                </g>


                {error && <g data-part="error" transform="translate(490, 190)">
                  <polygon points="0,-45 15,-15 45,-25 25,0 50,20 20,22 22,50 -5,28 -30,45 -20,15 -50,5 -22,-10 -38,-35 -10,-20" fill="#ef4444" stroke="#fee2e2" strokeWidth="3"/>
                  <text x="0" y="8" fill="#ffffff" fontSize="13" fontWeight="900" textAnchor="middle">오류!</text>
                </g>}
              </svg>;
}
