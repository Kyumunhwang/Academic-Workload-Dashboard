"우리의 대시보드 확장성을 위해 기존에 CalendarBoard 내부에 있던 학년 선택 상태를 Context API를 활용한 전역 상태 관리로 리팩토링하는 GradeFilter Skill을 구현할 거야. Next.js (App Router) 환경에 맞춰 다음 단계대로 코드를 작성해 줘.

Context 생성:

context/GradeContext.jsx (또는 .tsx) 파일을 생성해. (반드시 "use client" 명시)

GradeContext와 GradeProvider를 만들고, 전역 상태로 selectedGrade와 setSelectedGrade를 관리해 줘.

초기(Default) 값은 'Grade 6'으로 설정해.

사용할 수 있는 학년 목록(Grade 6 ~ Grade 12)을 배열 상수로 정의해서 함께 export 해 줘.

Provider 적용 (App Router 호환):

app/layout.js (또는 .tsx) 파일을 수정해서, 방금 만든 GradeProvider로 자식 컴포넌트들({children})을 감싸 줘. 이렇게 하면 앱 전체에서 학년 상태를 공유할 수 있어.

기존 캘린더 컴포넌트 리팩토링:

components/CalendarBoard.jsx에서 기존에 useState로 관리하던 학년 상태 코드를 지우고, 대신 useContext(GradeContext)를 호출하여 selectedGrade와 setSelectedGrade를 가져와서 사용하도록 수정해.

UI 컴포넌트 분리 (선택적 리팩토링):

캘린더 상단에 있던 '학년 선택 드롭다운 UI'를 components/GradeSelector.jsx라는 별도의 클라이언트 컴포넌트로 분리해 줘.

이 드롭다운 컴포넌트 역시 Context API를 구독하여 학년을 변경할 수 있게 하고, 디자인은 기존처럼 Tailwind CSS로 깔끔하게 유지해.

메인 페이지(app/page.js)에서 상단에는 <GradeSelector/>를, 그 아래에는 <CalendarBoard/>를 배치하는 구조로 화면 구성을 업데이트해 줘.

작업 과정을 간략히 설명하고, 기존 코드가 깨지지 않도록 안전하게 수정 및 적용해 줘."