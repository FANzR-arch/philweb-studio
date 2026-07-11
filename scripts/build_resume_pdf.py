from pathlib import Path
"""
[INPUT]   : 站内简历信息、排版样式参数与输出目录
[OUTPUT]  : public/assets 下可下载的 PDF 简历文件
[POS]     : 独立构建脚本层
[DECISION]: 使用 reportlab 直接绘制 PDF，确保导出版本与站内简历信息尽量保持一致
"""

import os
import shutil

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "assets" / "fan-zheren-ai-pm-resume.pdf"
LEGACY_OUTPUT = ROOT / "public" / "assets" / "RZC-AI产品经理 .pdf"


def build_pdf(output_path: Path) -> None:
    pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))

    styles = getSampleStyleSheet()
    base = ParagraphStyle(
        "Base",
        parent=styles["Normal"],
        fontName="STSong-Light",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1f2937"),
        alignment=TA_LEFT,
    )
    styles.add(base)
    styles.add(
        ParagraphStyle(
            "Name",
            parent=base,
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#111827"),
            spaceAfter=2,
        )
    )
    styles.add(
        ParagraphStyle(
            "Role",
            parent=base,
            fontSize=11,
            leading=15,
            textColor=colors.HexColor("#0f766e"),
        )
    )
    styles.add(
        ParagraphStyle(
            "Section",
            parent=base,
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#0f766e"),
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            "ItemTitle",
            parent=base,
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#111827"),
            spaceAfter=2,
        )
    )
    styles.add(
        ParagraphStyle(
            "ResumeBullet",
            parent=base,
            leftIndent=10,
            firstLineIndent=-8,
            spaceAfter=2,
        )
    )

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=12 * mm,
        bottomMargin=10 * mm,
    )

    story = [
        Paragraph("RZC", styles["Name"]),
        Paragraph("AI产品经理", styles["Role"]),
        Spacer(1, 4),
        Paragraph(
            "17861431201 | 1035779237@qq.com | 出生日期：1998 | 工作年限：4年经验 | 求职意向：AI产品经理 | 目标城市：杭州",
            base,
        ),
        Spacer(1, 8),
        Paragraph("一句话定位", styles["Section"]),
        Paragraph(
            "聚焦 AI 工具应用与产品验证。擅长把模糊需求拆解为可验证的 AI 产品方案，推进从需求分析、原型设计到 MVP 验证的闭环。",
            base,
        ),
        Spacer(1, 6),
        Paragraph("核心能力", styles["Section"]),
    ]

    strengths = [
        "聚焦 AI 工具应用与产品验证，持续围绕真实场景进行产品实践。",
        "擅长把模糊需求拆解为可验证的 AI 产品方案，推进从需求分析、原型设计到 MVP 验证的闭环。",
        "具备 AI 工具应用、原型搭建、项目推进与跨角色协同能力。",
    ]
    for item in strengths:
        story.append(Paragraph(f"• {item}", styles["ResumeBullet"]))

    story.extend(
        [
            Spacer(1, 6),
            Paragraph("工作经历", styles["Section"]),
            Paragraph("山东三元建筑设计有限公司 | 项目经理 / 主管 | 2025.06 - 至今", styles["ItemTitle"]),
            Paragraph(
                "• 负责项目推进与协同，在方案构思、表达与交付过程中持续引入 AI 工具与规则化方法，优化协作效率和输出质量。",
                styles["ResumeBullet"],
            ),
            Paragraph(
                "• 围绕真实痛点独立推进多个 AI 工具项目，持续积累问题定义、方案设计与 MVP 验证经验。",
                styles["ResumeBullet"],
            ),
            Spacer(1, 2),
            Paragraph("自然营造（北京）建筑设计事务所有限公司 | 建筑设计师 | 2022.07 - 2025.06", styles["ItemTitle"]),
            Paragraph(
                "• 在真实项目中持续使用 LLM、多模态 AI 与图像生成工具，沉淀 AI 辅助工作流并提升方案表达与协同效率。",
                styles["ResumeBullet"],
            ),
            Paragraph(
                "• 在复杂任务和跨角色协作中承担沟通、协调与方案调整工作，形成较强的任务拆解与阶段推进能力。",
                styles["ResumeBullet"],
            ),
            Spacer(1, 6),
            Paragraph("项目经历", styles["Section"]),
            Paragraph("枋程AI | 需求分析 / 流程设计 / 原型验证", styles["ItemTitle"]),
            Paragraph(
                "• 围绕概念阶段需求不清、沟通成本高、方案生成不可控的问题，完成需求定义、流程设计、原型搭建与版本验证。",
                styles["ResumeBullet"],
            ),
            Paragraph(
                "• 将概念阶段由约 1 周压缩至 1 天甚至数小时，验证 AI 在垂直创作场景中的辅助价值。",
                styles["ResumeBullet"],
            ),
            Spacer(1, 2),
            Paragraph("种子时间 | 需求分析 / 产品概念 / Demo 验证", styles["ItemTitle"]),
            Paragraph(
                "• 围绕“只记录时长、无法形成有效复盘”的问题，设计本地行为记录 + AI 复盘工具，完成产品概念与 Demo 验证。",
                styles["ResumeBullet"],
            ),
            Paragraph(
                "• 形成对行为记录、AI 复盘与陪伴式效率产品的场景理解，并完成多轮方向迭代。",
                styles["ResumeBullet"],
            ),
            Spacer(1, 2),
            Paragraph("画外边框 | 需求拆解 / 交互设计 / 版本交付", styles["ItemTitle"]),
            Paragraph(
                "• 围绕摄影用户发布前处理繁琐的问题，设计图片美化与 EXIF 展示工具，完成 Win / Web 可用版本上线。",
                styles["ResumeBullet"],
            ),
            Paragraph(
                "• 获得 5w+ 曝光与 50+ 真实用户反馈，验证垂直兴趣场景中的工具需求。",
                styles["ResumeBullet"],
            ),
        ]
    )

    doc.build(story)


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    build_pdf(OUTPUT)
    shutil.copyfile(OUTPUT, LEGACY_OUTPUT)


if __name__ == "__main__":
    main()
