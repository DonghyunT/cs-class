import { LessonArt } from "@/components/explore/lesson-art";
import styles from "@/components/explore/explore.module.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Construction } from "lucide-react";
import { Brand, DemoBanner } from "@/components/visuals";
import { lessons } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
export function generateStaticParams() {
  return lessons.map((lesson) => ({ id: lesson.id }));
}
export default async function Explore({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = lessons.find((item) => item.id === id);
  if (!lesson) notFound();
  return (
    <>
      <DemoBanner />
      <div className={styles["landing"]}>
        <header className={styles["public-header"]}>
          <Brand />
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/" />}
          >
            <ArrowLeft size={16} /> 홈으로
          </Button>
        </header>
        <main id="main-content" className={styles["explore-detail"]}>
          <div className={`${styles["detail-art"]} ${styles[lesson.color]}`}>
            <LessonArt kind={lesson.id} />
          </div>
          <span className={styles["eyebrow"]}>{lesson.category}</span>
          <h1>{lesson.title}</h1>
          <p>{lesson.subtitle}</p>
          <div className={styles["preparation-note"]}>
            <Construction size={20} />
            <div>
              <strong>배움의 공간을 준비하고 있어요.</strong>
              <p>
                이 페이지는 수업 주제를 소개하는 미리보기예요.
                <br />
                공개된 수업은 로그인 후 내 교실에서 확인할 수 있어요.
              </p>
            </div>
          </div>
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href="/login/student" />}
          >
            내 교실 둘러보기 <ArrowRight size={18} />
          </Button>
        </main>
      </div>
    </>
  );
}
