# Storybook 설정 가이드

이 프로젝트는 Storybook을 사용하여 컴포넌트를 개발하고 문서화합니다.

## 실행 방법

```bash
# 개발 서버 실행 (포트 6006)
npm run storybook

# 프로덕션 빌드
npm run build-storybook
```

## 설정 파일

- `.storybook/main.ts`: Storybook 메인 설정 (스토리 경로, 애드온, Vite 설정)
- `.storybook/preview.ts`: 전역 데코레이터 및 파라미터 설정

## 주요 기능

- **Material-UI 통합**: ThemeProvider와 CssBaseline이 자동으로 적용됩니다.
- **Tailwind CSS**: 전역 스타일이 자동으로 로드됩니다.
- **경로 Alias**: `@app`, `@pages`, `@widgets`, `@features`, `@entities`, `@shared` 경로가 자동으로 해석됩니다.
- **접근성 검사**: `@storybook/addon-a11y`로 접근성을 검사할 수 있습니다.
- **자동 문서화**: `autodocs` 태그로 자동 문서가 생성됩니다.

## 스토리 작성 가이드

각 UI 컴포넌트는 동일 디렉터리에 `<ComponentName>.stories.tsx` 파일을 작성합니다.

예시: `src/features/accounts/ui/AccountCard.stories.tsx`

자세한 내용은 `.cursor/rules/project.mdc`의 "컴포넌트 설계 및 문서화" 섹션을 참고하세요.

