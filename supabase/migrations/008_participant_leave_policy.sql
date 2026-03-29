-- =============================================================================
-- ZENTRALE – Add DELETE policy for session_participants (leave lobby)
-- =============================================================================
-- Allows players to remove themselves from a session while it's in lobby state.
-- =============================================================================

CREATE POLICY "Players can leave lobby sessions"
  ON public.session_participants FOR DELETE
  USING (
    user_id = auth.uid()
    AND role = 'player'
    AND EXISTS (
      SELECT 1 FROM public.game_sessions gs
      WHERE gs.id = session_participants.session_id
        AND gs.status = 'lobby'
    )
  );
