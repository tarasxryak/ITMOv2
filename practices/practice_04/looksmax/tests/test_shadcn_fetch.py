import unittest

from tools.shadcn_fetch import imports_of, rewrite_imports

# Так исходник приходит из MCP shadcn: утилита называется "cn", алиасы указывают в реестр shadcn.
FROM_MCP = '''import * as React from "react"
import { cn } from "cn"
import { Button } from "@/registry/new-york-v4/ui/button"
import { useIsMobile } from "@/registry/new-york-v4/hooks/use-mobile"
'''


class RewriteImportsTest(unittest.TestCase):
    def test_points_imports_at_this_project(self):
        result = rewrite_imports(FROM_MCP)
        self.assertIn('import { cn } from "@/lib/utils"', result)
        self.assertIn('from "@/components/ui/button"', result)
        self.assertIn('from "@/hooks/use-mobile"', result)
        self.assertNotIn("registry", result)
        self.assertNotIn('from "cn"', result)

    def test_leaves_other_imports_alone(self):
        self.assertIn('import * as React from "react"', rewrite_imports(FROM_MCP))

    def test_ends_with_newline(self):
        self.assertTrue(rewrite_imports("export {}").endswith("\n"))
        self.assertEqual(rewrite_imports("export {}\n"), "export {}\n")

    def test_imports_of_lists_modules_sorted_and_unique(self):
        self.assertEqual(imports_of(rewrite_imports(FROM_MCP)), ["@/components/ui/button", "@/hooks/use-mobile", "@/lib/utils", "react"])


if __name__ == "__main__":
    unittest.main()
