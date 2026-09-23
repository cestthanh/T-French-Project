import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AvailableQuiz, ManagedQuiz, QuizAttempt, QuizResult, SaveQuizRequest } from 'src/app/interface';
import { uriConfig } from './Uri/uriConfig';

@Injectable({ providedIn: 'root' })
export class QuizService {
  private readonly base = uriConfig.QUIZ;
  constructor(private http: HttpClient) {}

  getManaged(): Observable<ManagedQuiz[]> { return this.http.get<ManagedQuiz[]>(`${this.base}/manage`); }
  create(data: SaveQuizRequest): Observable<{ id: number }> { return this.http.post<{ id: number }>(this.base, data); }
  togglePublish(id: number): Observable<{ isPublished: boolean }> { return this.http.patch<{ isPublished: boolean }>(`${this.base}/${id}/publish`, {}); }
  getAvailable(): Observable<AvailableQuiz[]> { return this.http.get<AvailableQuiz[]>(`${this.base}/available`); }
  start(id: number): Observable<{ id: number }> { return this.http.post<{ id: number }>(`${this.base}/${id}/start`, {}); }
  getAttempt(id: number): Observable<QuizAttempt> { return this.http.get<QuizAttempt>(`${this.base}/attempts/${id}`); }
  saveAnswers(id: number, version: number, answers: Array<{ questionId: number; textAnswer?: string; selectedOptionIds: number[] }>): Observable<{ version: number }> {
    return this.http.put<{ version: number }>(`${this.base}/attempts/${id}/answers`, { version, answers });
  }
  submit(id: number): Observable<{ status: string; score?: number }> { return this.http.post<{ status: string; score?: number }>(`${this.base}/attempts/${id}/submit`, {}); }
  getResults(id: number): Observable<QuizResult[]> { return this.http.get<QuizResult[]>(`${this.base}/${id}/results`); }
  gradeAnswer(answerId: number, score: number, feedback?: string): Observable<unknown> {
    return this.http.patch(`${this.base}/answers/${answerId}/grade`, { score, feedback });
  }
}
