# 강사님 안내서

이 사이트를 처음 쓰는 강사님(`instructor` 계정, 2학년 10반·11반)께 보내는 사용법 안내서입니다. 보낼 파일은 [`CS-Class-강사님-안내서.pdf`](CS-Class-강사님-안내서.pdf)이고, 원본은 [`guide.html`](guide.html)입니다.

## 다시 만들기

화면이나 버튼 이름이 바뀌면 캡처와 PDF를 다시 만듭니다. 캡처는 로컬 데모(에뮬레이터)에서만 찍고, 운영 사이트나 실제 학생 정보는 쓰지 않습니다.

1. `npm run dev:emulator`로 로컬 데모를 켭니다.
2. `node teaching-materials/instructor-guide/capture.mjs`로 `images/`의 화면을 다시 찍습니다.
3. `guide.html`의 문구를 맞춘 뒤 `node teaching-materials/instructor-guide/build-pdf.mjs`로 PDF를 만듭니다.
4. PDF를 페이지 이미지로 열어 잘림·깨짐이 없는지 확인합니다.
