# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from page_remaker.graph.pipeline import cro_pipeline

@method_decorator(csrf_exempt, name="dispatch")
class Analyze(APIView):
    def post(self, request):
        try:
            url         = request.data.get("url", "").strip()
            ad_creative = request.data.get("ad_creative", "").strip()

            if not url or not ad_creative:
                return Response({"error": "url and ad_creative required"}, status=400)

            initial_state = {
                "url":               url,
                "ad_creative":       ad_creative,
                "original_html":     "",
                "body_html":         "",
                "final_html":        "",
                "suggested_changes": [],
                "errors":            [],
            }

            final_state = cro_pipeline.invoke(initial_state)

            return Response({
                "status":       "success" if not final_state.get("errors") else "partial/failed",
                "changes_made": final_state.get("suggested_changes", []), # The JSON array with reasoning & targeting
                "final_html":   final_state.get("final_html", ""),
                "old_html":     final_state.get("original_html", ""),
                "errors":       final_state.get("errors", []),
            })
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)