import axios from 'axios';

function httpStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

/** Start-failure copy for a Drill. 409 is an empty Mistakes union; 401 is unsigned. */
export function drillStartErrorMessage(
  error: unknown,
  copy: {
    nothingToReview: string;
    signInRequired: string;
    fallback: string;
  }
): string {
  switch (httpStatus(error)) {
    case 409:
      return copy.nothingToReview;
    case 401:
      return copy.signInRequired;
    default:
      return copy.fallback;
  }
}
