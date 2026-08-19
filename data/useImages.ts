import { useAllProjects, useSharedContent } from './ContentProvider';

export function useAvatarImages() {
  const shared = useSharedContent();
  const light = shared.assets.avatarLight;
  const dark = shared.assets.avatarDark || light;
  return { light, dark, current: light };
}

export function useCoverImages(projectId: string) {
  const projects = useAllProjects();
  const project = projects.find((item) => item.id === projectId);
  const light = project?.assets?.coverLight || project?.cover;
  const dark = project?.assets?.coverDark || light;
  if (!light) return null;
  return { light, dark, current: light };
}

export function useDetailImages(projectId: string): readonly string[] {
  const projects = useAllProjects();
  const project = projects.find((item) => item.id === projectId);
  const localized = project?.locales?.zh?.detailImages;
  if (localized && localized.length > 0) return localized;
  return project?.detailImages || [];
}
