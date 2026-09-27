import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Construction } from "lucide-react";
import { Brand, DemoBanner, LessonArt } from "@/components/visuals";
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
      <div className="landing">
        <header className="public-header">
          <Brand />
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/" />}
          >
            <ArrowLeft size={16} /> 홈으로
          </Button>
        </header>
        <main id="main-content" className="explore-detail">
          <div className={`detail-art ${lesson.color}`}>
            <LessonArt kind={lesson.id} />
          </div>
          <span className="eyebrow">{lesson.category}</span>
          <h1>{lesson.title}</h1>
          <p>{lesson.subtitle}</p>
          <div className="preparation-note">
            <Construction size={20} />
            <div>
              <strong>배움의 공간을 준비하고 있어요.</strong>
              <p>
                지금은 교실 화면을 먼저 만드는 중이에요.
                <br />
                수업 내용과 활동은 차근차근 채워질 예정이에요.
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
