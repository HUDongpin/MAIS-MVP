#!/usr/bin/env python3
"""California-focused independent verification of all 1,992 US_CA_MATH
practice-arena questions (2026-07-10, post-fix bank).

Every answer is recomputed FROM THE PROMPT TEXT alone (never from generator
parameters), compared under production-grader semantics. Items no parser
understands are queued for manual review — the goal is 100% accounted-for.
"""
import json
import math
import re
import sys
from collections import Counter, defaultdict
from fractions import Fraction

sys.path.insert(0, ".")
from audit_engine import answer_matches, parse_scalar_answer, eval_arith, normalize_math_text

INV = sys.argv[1] if len(sys.argv) > 1 else "ca-inventory.json"
OUT = sys.argv[2] if len(sys.argv) > 2 else "ca-verify-results.json"

qs = json.load(open(INV))["questions"]

NUM = r"-?\d+(?:\.\d+)?"


def nums(text):
    return [Fraction(n) for n in re.findall(NUM, text)]


def frac_str(x):
    if isinstance(x, Fraction):
        return str(x.numerator) if x.denominator == 1 else f"{x.numerator}/{x.denominator}"
    return str(x)


def dec_str(x):
    if isinstance(x, Fraction):
        d = x.denominator
        while d % 2 == 0:
            d //= 2
        while d % 5 == 0:
            d //= 5
        if d == 1:
            s = f"{float(x):.6f}".rstrip("0").rstrip(".")
            return s or "0"
        return frac_str(x)
    return str(x)


def core_of(prompt_en):
    """Strip K-5 scaffold prefixes: 'X checkpoint: <phrase>: core' -> core."""
    t = prompt_en.strip()
    m = re.match(r"^[^:]{0,90}checkpoint:\s*(.*)$", t, re.I)
    if m:
        t = m.group(1).strip()
        # a second scaffold clause ends at the first ':' if a sentence follows
        m2 = re.match(r"^[^:.?]{0,80}:\s*(.*)$", t)
        if m2:
            t = m2.group(1).strip()
    return t


# --------------------------------------------------------------------------
# family parsers: (name, regex on core/en, solve(match, q) -> value|str|None)
# --------------------------------------------------------------------------

def solve_take_away(m, q):
    return Fraction(m.group(1)) - Fraction(m.group(2))


def solve_join_two(m, q):
    return Fraction(m.group(1)) + Fraction(m.group(2))


FAMILIES = []


def family(name, pattern, flags=re.I):
    rx = re.compile(pattern, flags)

    def register(fn):
        FAMILIES.append((name, rx, fn))
        return fn
    return register


# ---------------- K-5 cores ----------------
@family("takeaway-left", r"there (?:are|is) (\d+)[^.]*?\.\s*(\d+) (?:are|is) (?:moved away|taken away|given away|eaten|used|removed)[^.]*\.\s*how many[^?]*(?:left|remain)")
def f1(m, q):
    return Fraction(m.group(1)) - Fraction(m.group(2))


@family("attribute-count", r"has \d+ [a-z ]+ buttons and (\d+) square buttons\.\s*how many buttons are square")
def f2a(m, q):
    return Fraction(m.group(1))


@family("picture-graph-compare", r"(?:picture graph|class chart) shows (\d+) [a-z]+ and (\d+) [a-z]+\.\s*which [a-z]+ has more, and by how many")
def f2b(m, q):
    return abs(Fraction(m.group(1)) - Fraction(m.group(2)))


@family("dimes-pennies", r"has (\d+) dimes? and (\d+) penn(?:y|ies)\.\s*how many cents")
def f2c(m, q):
    return 10 * Fraction(m.group(1)) + Fraction(m.group(2))


@family("join-groups", r"has (\d+) [a-z ]+ and (\d+) [a-z ]+\.\s*how many [a-z ]+(?:are (?:there|on)|in all|altogether|total)")
def f2(m, q):
    return Fraction(m.group(1)) + Fraction(m.group(2))


@family("join-simple", r"(\d+) (?:small|red|blue|green|large|big|little)?\s*[a-z]+ (?:and|join) (\d+) (?:small|red|blue|green|large|big|little)?\s*[a-z]+(?:\s+(?:are put together|join them|come|arrive))?[^?]*how many[^?]*(?:in all|altogether|total|on the tray|are there)")
def f3(m, q):
    return Fraction(m.group(1)) + Fraction(m.group(2))


@family("equation-match-join", r"which equation matches this join story[^:]*:\s*(\d+)[^\d]+(\d+)")
def f4(m, q):
    a, b = int(m.group(1)), int(m.group(2))
    return f"{a} + {b} = {a + b}"


@family("equation-match-takeaway", r"which equation matches this (?:take[- ]away|separate) story[^:]*:\s*(\d+)[^\d]+(\d+)")
def f5(m, q):
    a, b = int(m.group(1)), int(m.group(2))
    return f"{a} - {b} = {a - b}"


@family("shape-label", r"which shape name matches an object with the label \"([a-z ]+)\"")
def f6(m, q):
    return m.group(1)


@family("evaluate-paren", r"evaluate (\d+) x \((\d+) \+ (\d+)\)")
def f7(m, q):
    return Fraction(m.group(1)) * (Fraction(m.group(2)) + Fraction(m.group(3)))


@family("evaluate-paren-minus", r"evaluate (\d+) x \((\d+) - (\d+)\)")
def f7b(m, q):
    return Fraction(m.group(1)) * (Fraction(m.group(2)) - Fraction(m.group(3)))


@family("count-next", r"what number comes (?:right )?after (\d+)(?: when counting)?")
def f8(m, q):
    return Fraction(m.group(1)) + 1


@family("count-before", r"what number comes (?:right )?before (\d+)")
def f9(m, q):
    return Fraction(m.group(1)) - 1


@family("compare-more", r"which (?:number is (?:more|greater|larger)|is more)[^\d]*(\d+) or (\d+)")
def f10(m, q):
    return max(Fraction(m.group(1)), Fraction(m.group(2)))


@family("compare-fewer", r"which (?:number is (?:fewer|less|smaller)|is fewer)[^\d]*(\d+) or (\d+)")
def f11(m, q):
    return min(Fraction(m.group(1)), Fraction(m.group(2)))


@family("teen-ten-ones", r"(?:teen number|number) (?:that is |made of |with )?(?:1 ten|ten) and (\d+) (?:more )?ones")
def f12(m, q):
    return 10 + Fraction(m.group(1))


@family("teen-decompose", r"(\d+) (?:is|as) (?:1 ten|ten) and how many ones")
def f13(m, q):
    return Fraction(m.group(1)) - 10


@family("length-total", r"(?:ribbon|rope|string|stick|pencil)[^.]*?is (\d+) cm long\.[^.]*?(?:another|second)[^.]*?is (\d+) cm long[^?]*total")
def f14(m, q):
    return Fraction(m.group(1)) + Fraction(m.group(2))


@family("tens-ones-value", r"(\d+) tens? and (\d+) ones?")
def f15(m, q):
    return 10 * Fraction(m.group(1)) + Fraction(m.group(2))


@family("hundreds-tens-ones", r"(\d+) hundreds?(?:,| and)? (\d+) tens?,? (?:and )?(\d+) ones?")
def f16(m, q):
    return 100 * Fraction(m.group(1)) + 10 * Fraction(m.group(2)) + Fraction(m.group(3))


@family("array-total", r"(\d+) rows? (?:of|with) (\d+)")
def f17(m, q):
    return Fraction(m.group(1)) * Fraction(m.group(2))


@family("money-total-cents", r"(\d+) dimes? and (\d+) penn(?:y|ies)")
def f18(m, q):
    return 10 * Fraction(m.group(1)) + Fraction(m.group(2))


@family("skip-count", r"skip[- ]count(?:ing)? by (\d+)s?[^\d]*(\d+)(?:,\s*(\d+))?(?:,\s*(\d+))?[^?]*(?:next|comes next)")
def f19(m, q):
    step = Fraction(m.group(1))
    last = [g for g in m.groups()[1:] if g]
    return Fraction(last[-1]) + step


@family("mult-fact", r"(?:what is|find|evaluate)\s*(\d+)\s*(?:x|×)\s*(\d+)\s*[?.]?$")
def f20(m, q):
    return Fraction(m.group(1)) * Fraction(m.group(2))


@family("div-fact", r"(?:what is|find|evaluate)\s*(\d+)\s*(?:÷|/)\s*(\d+)\s*[?.]?$")
def f21(m, q):
    return Fraction(m.group(1)) / Fraction(m.group(2))


@family("add-within", r"(?:what is|find|evaluate|add:?)\s*(\d+)\s*\+\s*(\d+)\s*[?.]?$")
def f22(m, q):
    return Fraction(m.group(1)) + Fraction(m.group(2))


@family("sub-within", r"(?:what is|find|evaluate|subtract:?)\s*(\d+)\s*-\s*(\d+)\s*[?.]?$")
def f23(m, q):
    return Fraction(m.group(1)) - Fraction(m.group(2))


@family("share-equally", r"(\d+) [a-z ]+ (?:are )?shared equally (?:among|between|into) (\d+)")
def f24(m, q):
    return Fraction(m.group(1)) / Fraction(m.group(2))


@family("perimeter-rect", r"rectangle[^.]*?(\d+) (?:cm|m|units?)[^.]*?(\d+) (?:cm|m|units?)[^?]*perimeter")
def f25(m, q):
    return 2 * (Fraction(m.group(1)) + Fraction(m.group(2)))


@family("area-rect-k5", r"rectangle[^.]*?(\d+) (?:cm|m|units?)[^.]*?(\d+) (?:cm|m|units?)[^?]*area")
def f26(m, q):
    return Fraction(m.group(1)) * Fraction(m.group(2))


@family("volume-prism-k5", r"(?:prism|box)[^.]*?(\d+)[^.]*?(?:by|x|×)[^.]*?(\d+)[^.]*?(?:by|x|×)[^.]*?(\d+)[^?]*volume")
def f27(m, q):
    return Fraction(m.group(1)) * Fraction(m.group(2)) * Fraction(m.group(3))


@family("clock-time", r"hour hand[^.]*?(\d+)[^.]*minute hand[^.]*12")
def f28(m, q):
    return f"{m.group(1)}:00"


@family("fraction-shaded", r"(\d+) (?:out of|of) (\d+) (?:equal )?parts? (?:are |is )?shaded")
def f29(m, q):
    return Fraction(int(m.group(1)), int(m.group(2)))


@family("angle-add", r"angles? (?:measure|of) (\d+)° and (\d+)°[^?]*(?:total|combined|sum)")
def f30(m, q):
    return Fraction(m.group(1)) + Fraction(m.group(2))


@family("convert-m-cm", r"(\d+) meters? [^?]*how many centimeters")
def f31(m, q):
    return Fraction(m.group(1)) * 100


@family("convert-ft-in", r"(\d+) feet [^?]*how many inches")
def f32(m, q):
    return Fraction(m.group(1)) * 12


@family("round-nearest", r"round (\d+(?:\.\d+)?) to the nearest (ten|hundred|thousand|tenth|hundredth|whole number)")
def f33(m, q):
    v = float(m.group(1))
    unit = m.group(2)
    scale = {"ten": 10, "hundred": 100, "thousand": 1000, "tenth": Fraction(1, 10),
             "hundredth": Fraction(1, 100), "whole number": 1}[unit]
    s = float(scale)
    r = round(v / s) * s
    # round-half-up like school convention
    if abs((v / s) % 1 - 0.5) < 1e-9:
        r = math.floor(v / s + 0.5) * s
    return Fraction(str(round(r, 6)))


# ---------------- G6-12 template families (regenerated bank) ----------------
@family("unit-rate", r"travels (\d+) miles in (\d+) hours at a steady speed")
def g1(m, q):
    return Fraction(m.group(1)) / Fraction(m.group(2))


@family("percent-of", r"what is (\d+)% of (\d+)\?")
def g2(m, q):
    return Fraction(m.group(1)) * Fraction(m.group(2)) / 100


@family("least-integer", r"which number is the least: (-?\d+), (-?\d+), or (-?\d+)")
def g3(m, q):
    return min(Fraction(m.group(1)), Fraction(m.group(2)), Fraction(m.group(3)))


@family("abs-value", r"value of \|-(\d+)\|")
def g4(m, q):
    return Fraction(m.group(1))


@family("evaluate-linear-expr", r"evaluate the expression (\d+)x \+ (\d+) when x = (\d+)")
def g5(m, q):
    return Fraction(m.group(1)) * Fraction(m.group(3)) + Fraction(m.group(2))


@family("one-step-add", r"solve for x: x \+ (\d+) = (\d+)\.")
def g6(m, q):
    return Fraction(m.group(2)) - Fraction(m.group(1))


@family("one-step-mult", r"solve for x: (\d+)x = (\d+)\.")
def g7(m, q):
    return Fraction(m.group(2)) / Fraction(m.group(1))


@family("prism-volume", r"prism is (\d+) cm long, (\d+) cm wide, and (\d+) cm tall")
def g8(m, q):
    return Fraction(m.group(1)) * Fraction(m.group(2)) * Fraction(m.group(3))


@family("triangle-area", r"triangle has a base of (\d+) cm and a height of (\d+) cm")
def g9(m, q):
    return Fraction(m.group(1)) * Fraction(m.group(2)) / 2


@family("mean-list", r"records the data values ((?:\d+, )+\d+)\. what is the mean")
def g10(m, q):
    vals = nums(m.group(1))
    return sum(vals) / len(vals)


@family("median-list", r"find the median of the data set ((?:\d+, )+\d+)")
def g11(m, q):
    vals = sorted(nums(m.group(1)))
    return vals[len(vals) // 2]


@family("proportion", r"solve the proportion: (\d+)/(\d+) = x/(\d+)")
def g12(m, q):
    return Fraction(m.group(1)) * Fraction(m.group(3)) / Fraction(m.group(2))


@family("prop-constant", r"y = (\d+) when x = (\d+)\. what is the constant of proportionality")
def g13(m, q):
    return Fraction(m.group(1)) / Fraction(m.group(2))


@family("integer-chain", r"evaluate: (-?\d+) − \(−(\d+)\) \+ \(−(\d+)\)")
def g14(m, q):
    return Fraction(m.group(1)) + Fraction(m.group(2)) - Fraction(m.group(3))


@family("fraction-product", r"multiply and simplify: (\d+)/(\d+) × (\d+)/(\d+)")
def g15(m, q):
    return Fraction(int(m.group(1)), int(m.group(2))) * Fraction(int(m.group(3)), int(m.group(4)))


@family("two-step", r"solve for x: (\d+)x \+ (\d+) = (\d+)\.")
def g16(m, q):
    return (Fraction(m.group(3)) - Fraction(m.group(2))) / Fraction(m.group(1))


@family("distribute", r"solve for x: (\d+)\(x \+ (\d+)\) = (\d+)")
def g17(m, q):
    return Fraction(m.group(3)) / Fraction(m.group(1)) - Fraction(m.group(2))


@family("scale-area", r"scale 1 cm : (\d+) m\. the drawing is (\d+) cm long and (\d+) cm wide\. what is the actual area")
def g18(m, q):
    k, l, w = (Fraction(m.group(i)) for i in (1, 2, 3))
    return (l * k) * (w * k)


@family("circumference", r"diameter of (\d+) cm\. using π ≈ 3\.14, what is its circumference")
def g19(m, q):
    return Fraction(314, 100) * Fraction(m.group(1))


@family("marble-prob", r"holds (\d+) marbles and (\d+) of them are red")
def g20(m, q):
    return Fraction(int(m.group(2)), int(m.group(1)))


@family("prob-complement", r"probability that it rains tomorrow is (\d+)/(\d+)")
def g21(m, q):
    return 1 - Fraction(int(m.group(1)), int(m.group(2)))


@family("both-sides", r"solve for x: (\d+)x \+ (\d+) = (\d+)x \+ (\d+)\.")
def g22(m, q):
    a, b, c, d = (Fraction(m.group(i)) for i in (1, 2, 3, 4))
    return (d - b) / (a - c)


@family("sum-difference", r"sum of (\d+) and a difference of (\d+)\. what is the larger")
def g23(m, q):
    return (Fraction(m.group(1)) + Fraction(m.group(2))) / 2


@family("slope-points", r"passes through the points \((-?\d+), (-?\d+)\) and \((-?\d+), (-?\d+)\)\. what is the slope")
def g24(m, q):
    x1, y1, x2, y2 = (Fraction(m.group(i)) for i in (1, 2, 3, 4))
    return (y2 - y1) / (x2 - x1)


@family("y-at-x", r"line y = (\d+)x ([+−]) (\d+), what is the value of y when x = (\d+)")
def g25(m, q):
    b = Fraction(m.group(3)) * (1 if m.group(2) == "+" else -1)
    return Fraction(m.group(1)) * Fraction(m.group(4)) + b


@family("translate-y", r"point \((-?\d+), (-?\d+)\) is translated (\d+) units right and (\d+) units down\. what is the y-coordinate")
def g26(m, q):
    return Fraction(m.group(2)) - Fraction(m.group(4))


@family("reflect-y", r"point \((-?\d+), (-?\d+)\) is reflected over the x-axis\. what is the y-coordinate")
def g27(m, q):
    return -Fraction(m.group(2))


@family("hypotenuse", r"legs of (\d+) cm and (\d+) cm\. what is the length of the hypotenuse")
def g28(m, q):
    a, b = int(m.group(1)), int(m.group(2))
    c2 = a * a + b * b
    c = math.isqrt(c2)
    return Fraction(c) if c * c == c2 else None


@family("distance-points", r"distance between the points \((-?\d+), (-?\d+)\) and \((-?\d+), (-?\d+)\)")
def g29(m, q):
    x1, y1, x2, y2 = (int(m.group(i)) for i in (1, 2, 3, 4))
    d2 = (x2 - x1) ** 2 + (y2 - y1) ** 2
    d = math.isqrt(d2)
    return Fraction(d) if d * d == d2 else None


@family("predict-fit", r"ŷ = (\d+)x \+ (\d+)\. what value does the line predict when x = (\d+)")
def g30(m, q):
    return Fraction(m.group(1)) * Fraction(m.group(3)) + Fraction(m.group(2))


@family("residual", r"predicts ŷ = (\d+)x \+ (\d+)\. at x = (\d+) the observed value is (-?\d+)\. what is the residual")
def g31(m, q):
    return Fraction(m.group(4)) - (Fraction(m.group(1)) * Fraction(m.group(3)) + Fraction(m.group(2)))


@family("consecutive", r"sum of three consecutive integers is (\d+)\. what is the middle")
def g32(m, q):
    return Fraction(m.group(1)) / 3


@family("tickets", r"cost \$(\d+) each plus a one-time \$(\d+) booking fee\. a group paid \$(\d+)")
def g33(m, q):
    return (Fraction(m.group(3)) - Fraction(m.group(2))) / Fraction(m.group(1))


@family("f-evaluate", r"given f\(x\) = (\d+)x ([+−]) (\d+), find f\((\d+)\)")
def g34(m, q):
    b = Fraction(m.group(3)) * (1 if m.group(2) == "+" else -1)
    return Fraction(m.group(1)) * Fraction(m.group(4)) + b


@family("f-solve", r"given f\(x\) = (\d+)x ([+−]) (\d+), solve f\(x\) = (-?\d+)")
def g35(m, q):
    b = Fraction(m.group(3)) * (1 if m.group(2) == "+" else -1)
    return (Fraction(m.group(4)) - b) / Fraction(m.group(1))


@family("quadratic-eval", r"for y = x² ([+−]) (\d+)x ([+−]) (\d+), what is the value of y when x = (\d+)")
def g36(m, q):
    b = Fraction(m.group(2)) * (1 if m.group(1) == "+" else -1)
    c = Fraction(m.group(4)) * (1 if m.group(3) == "+" else -1)
    k = Fraction(m.group(5))
    return k * k + b * k + c


@family("vertex-x", r"parabola y = (\d*)x² ([+−]) (\d+)x, at what value of x is the vertex")
def g37(m, q):
    a = Fraction(m.group(1)) if m.group(1) else Fraction(1)
    b = Fraction(m.group(3)) * (1 if m.group(2) == "+" else -1)
    return -b / (2 * a)


@family("midpoint-x", r"x-coordinate of the midpoint of the segment from \((-?\d+), (-?\d+)\) to \((-?\d+), (-?\d+)\)")
def g38(m, q):
    return (Fraction(m.group(1)) + Fraction(m.group(3))) / 2


@family("perp-slope", r"line has slope (-?\d+(?:/\d+)?)\. what is the slope of a line perpendicular")
def g39(m, q):
    s = m.group(1)
    v = Fraction(int(s.split("/")[0]), int(s.split("/")[1])) if "/" in s else Fraction(s)
    return -1 / v


@family("third-angle", r"two angles of a triangle measure (\d+)° and (\d+)°")
def g40(m, q):
    return 180 - Fraction(m.group(1)) - Fraction(m.group(2))


@family("exterior-angle", r"remote interior angles measure (\d+)° and (\d+)°")
def g41(m, q):
    return Fraction(m.group(1)) + Fraction(m.group(2))


@family("similar-side", r"triangle a has sides (\d+) cm and (\d+) cm\. triangle b is similar[^.]*scale factor of (\d+), and the side matching \d+ cm measures \d+ cm\. how long is the side matching (\d+) cm")
def g42(m, q):
    return Fraction(m.group(4)) * Fraction(m.group(3))


@family("tan-ratio", r"side opposite angle a is (\d+) and the side adjacent to angle a is (\d+)\. what is tan a")
def g43(m, q):
    return Fraction(int(m.group(1)), int(m.group(2)))


@family("arc-length", r"radius (\d+) cm\. using π ≈ 3\.14, what is the length of an arc with a central angle of (\d+)°")
def g44(m, q):
    return Fraction(m.group(2), ) / 360 * 2 * Fraction(314, 100) * Fraction(m.group(1))


@family("sector-area", r"radius (\d+) cm\. using π ≈ 3\.14, what is the area of a sector with a central angle of (\d+)°")
def g45(m, q):
    r = Fraction(m.group(1))
    return Fraction(m.group(2)) / 360 * Fraction(314, 100) * r * r


@family("larger-root", r"solve x² − (\d+)x \+ (\d+) = 0\. what is the larger root")
def g46(m, q):
    s, p = int(m.group(1)), int(m.group(2))
    disc = s * s - 4 * p
    r = math.isqrt(disc)
    if r * r != disc:
        return None
    return Fraction(s + r, 2)


@family("discriminant", r"discriminant of (\d*)x² \+ (\d+)x \+ (\d+) = 0")
def g47(m, q):
    a = int(m.group(1)) if m.group(1) else 1
    return Fraction(int(m.group(2)) ** 2 - 4 * a * int(m.group(3)))


@family("cond-prob", r"(\d+) students play a sport, and (\d+) of those also play music")
def g48(m, q):
    return Fraction(int(m.group(2)), int(m.group(1)))


@family("two-draws", r"has (\d+) marbles, (\d+) of them red\. two marbles are drawn without replacement")
def g49(m, q):
    t, r = int(m.group(1)), int(m.group(2))
    return Fraction(r, t) * Fraction(r - 1, t - 1)


@family("shifted-square", r"g\(x\) = f\(x − (\d+)\) ([+−]) (\d+)\. what is g\((\d+)\)")
def g50(m, q):
    k = Fraction(m.group(3)) * (1 if m.group(2) == "+" else -1)
    return (Fraction(m.group(4)) - Fraction(m.group(1))) ** 2 + k


@family("inverse-linear", r"f\(x\) = (\d+)x ([+−]) (\d+)\. what is f⁻¹\((-?\d+)\)")
def g51(m, q):
    b = Fraction(m.group(3)) * (1 if m.group(2) == "+" else -1)
    return (Fraction(m.group(4)) - b) / Fraction(m.group(1))


@family("doubling", r"doubles every (\d+) hours\. it starts at (\d+)\. how many bacteria are there after (\d+) hours")
def g52(m, q):
    d, p0, t = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if t % d:
        return None
    return Fraction(p0 * 2 ** (t // d))


@family("log-value", r"evaluate log_(\d+)\((\d+)\)")
def g53(m, q):
    base, val = int(m.group(1)), int(m.group(2))
    n = round(math.log(val, base))
    return Fraction(n) if base ** n == val else None


@family("amplitude", r"amplitude of y = (\d+) sin\((\d+)x\)")
def g54(m, q):
    return Fraction(m.group(1))


@family("period", r"period, in degrees, of y = sin\((\d+)x\)")
def g55(m, q):
    return Fraction(360, int(m.group(1)))


@family("sse-compare", r"model f has a sum of squared residuals of (\d+), and model g has (\d+)")
def g56(m, q):
    return "f" if int(m.group(1)) < int(m.group(2)) else "g"


@family("sample-prop", r"random sample of (\d+) students, (\d+) prefer")
def g57(m, q):
    return Fraction(int(m.group(2)), int(m.group(1)))


@family("sampling-mean", r"population has mean (\d+)\. random samples of size (\d+)")
def g58(m, q):
    return Fraction(m.group(1))


@family("kmh-ms", r"convert (\d+) km/h to meters per second")
def g59(m, q):
    return Fraction(int(m.group(1)) * 1000, 3600)


@family("sig-figs", r"measures (\d+\.\d+) m by (\d+\.\d+) m\. compute the area and round it to two significant figures")
def g60(m, q):
    v = float(m.group(1)) * float(m.group(2))
    from decimal import Decimal
    s = f"{v:.6f}"
    # round to 2 significant figures
    d = Decimal(s)
    shift = d.adjusted()  # exponent of leading digit
    quant = Decimal(1).scaleb(shift - 1)
    r = float(d.quantize(quant))
    return Fraction(str(round(r, 6)))


@family("cubic-eval", r"p\(x\) = x³ − (\d+)x at x = (\d+)")
def g61(m, q):
    a, k = int(m.group(1)), int(m.group(2))
    return Fraction(k ** 3 - a * k)


@family("sum-roots", r"polynomial \(x ([+−]) (\d+)\)\(x ([+−]) (\d+)\)\(x ([+−]) (\d+)\) = 0")
def g62(m, q):
    roots = []
    for sign, val in ((m.group(1), m.group(2)), (m.group(3), m.group(4)), (m.group(5), m.group(6))):
        r = int(val)
        roots.append(-r if sign == "+" else r)
    return Fraction(sum(roots))


@family("expected-value", r"ticket costs \$(\d+)\. one of every (\d+) tickets wins \$(\d+)\. what is the expected net gain")
def g63(m, q):
    return Fraction(m.group(3)) / Fraction(m.group(2)) - Fraction(m.group(1))


@family("z-score", r"mean (\d+) and standard deviation (\d+)\. what is the z-score of a value of (-?\d+)")
def g64(m, q):
    return (Fraction(m.group(3)) - Fraction(m.group(1))) / Fraction(m.group(2))


@family("avg-rate", r"f\(x\) = x², what is the average rate of change from x = (\d+) to x = (\d+)")
def g65(m, q):
    return Fraction(m.group(1)) + Fraction(m.group(2))


@family("vertex-max", r"maximum value of f\(x\) = −\(x − (\d+)\)² \+ (\d+)")
def g66(m, q):
    return Fraction(m.group(2))


@family("break-even", r"sells for \$(\d+) per unit; variable cost is \$(\d+) per unit and fixed costs are \$(\d+)")
def g67(m, q):
    return Fraction(m.group(3)) / (Fraction(m.group(1)) - Fraction(m.group(2)))


@family("profit-at-q", r"p = \((\d+) − (\d+)\)q − (\d+), where q is units sold\. what is the profit when q = (\d+)")
def g68(m, q):
    return (Fraction(m.group(1)) - Fraction(m.group(2))) * Fraction(m.group(4)) - Fraction(m.group(3))




# ---------------- additional families (raw template alphabet) ----------------
@family("fraction-add", r"add (\d+)/(\d+) \+ (\d+)/(\d+)")
def h1(m, q):
    return Fraction(int(m.group(1)), int(m.group(2))) + Fraction(int(m.group(3)), int(m.group(4)))


@family("fraction-mult-bare", r"(\d+)/(\d+) × (\d+)/(\d+)\s*[.?]?$")
def h2(m, q):
    return Fraction(int(m.group(1)), int(m.group(2))) * Fraction(int(m.group(3)), int(m.group(4)))


@family("integer-chain-bare", r"(-?\d+) − \(−(\d+)\) \+ \(−(\d+)\)")
def h3(m, q):
    return Fraction(m.group(1)) + Fraction(m.group(2)) - Fraction(m.group(3))


@family("dots-compare", r"one card shows (\d+) dots\. another card shows (\d+) dots\. which card has more", )
def h4(m, q):
    a, b = int(m.group(1)), int(m.group(2))
    return "left group" if a > b else "right group"


@family("rect-shaded-fraction", r"rectangle is split into (\d+) equal parts\. (\d+) parts? (?:are|is) shaded\. what fraction")
def h5(m, q):
    return Fraction(int(m.group(2)), int(m.group(1)))


@family("decimal-ones-hundredths", r"which decimal is (\d+) ones and (\d+) hundredths")
def h6(m, q):
    return Fraction(m.group(1)) + Fraction(int(m.group(2)), 100)


@family("ordered-pair", r"moves (\d+) units right from the origin and (\d+) units up\. what ordered pair")
def h7(m, q):
    return f"({m.group(1)}, {m.group(2)})"


@family("complementary-angle", r"two angles make a right angle\. one angle is (\d+) degrees\. what is the other")
def h8(m, q):
    return 90 - Fraction(m.group(1))


@family("equal-bags", r"(\d+) equal bags each hold (\d+) [a-z]+\. how many [a-z]+ are there in all")
def h9(m, q):
    return Fraction(m.group(1)) * Fraction(m.group(2))


@family("factor-check", r"is (\d+) a factor of (\d+)\?")
def h10(m, q):
    return "yes" if int(m.group(2)) % int(m.group(1)) == 0 else "no"


@family("ten-frame", r"ten-frame shows (\d+) counters and (\d+) more counters\. what number")
def h11(m, q):
    return Fraction(m.group(1)) + Fraction(m.group(2))


@family("fill-blank-add", r"fill in the number: (\d+) \+ (\d+) = __")
def h12(m, q):
    return Fraction(m.group(1)) + Fraction(m.group(2))


@family("shape-sides", r"how many sides does a (square|triangle|rectangle|pentagon|hexagon) have")
def h13(m, q):
    return Fraction({"triangle": 3, "square": 4, "rectangle": 4, "pentagon": 5, "hexagon": 6}[m.group(1)])


@family("transitive-length", r"a (\w+) is shorter than a (\w+)\. the \2 is shorter than a (\w+)\. which (?:object )?is (?:the )?longest")
def h14(m, q):
    return m.group(3)


@family("strip-compare", r"one paper strip is (\d+) cubes long\. another paper strip is (\d+) cubes long\. which (?:strip )?is longer")
def h15(m, q):
    return "first strip" if int(m.group(1)) > int(m.group(2)) else "second strip"


@family("teen-more-ones", r"(\d+) is (?:1 ten|ten|10) and how many more ones")
def h16(m, q):
    return Fraction(m.group(1)) - 10


# raw-alphabet duplicates of the G6-12 families that used normalized signs
@family("avg-rate-raw", r"f\(x\) = x², what is the average rate of change from x = (\d+) to x = (\d+)")
def h17(m, q):
    return Fraction(m.group(1)) + Fraction(m.group(2))


@family("larger-root-raw", r"solve x² − (\d+)x \+ (\d+) = 0\. what is the larger root")
def h18(m, q):
    s, p = int(m.group(1)), int(m.group(2))
    disc = s * s - 4 * p
    r = math.isqrt(disc)
    if r * r != disc:
        return None
    return Fraction(s + r, 2)


@family("cubic-eval-raw", r"p\(x\) = x³ − (\d+)x at x = (\d+)")
def h19(m, q):
    a, k = int(m.group(1)), int(m.group(2))
    return Fraction(k ** 3 - a * k)


@family("profit-raw", r"p = \((\d+) − (\d+)\)q − (\d+), where q is units sold\. what is the profit when q = (\d+)")
def h20(m, q):
    return (Fraction(m.group(1)) - Fraction(m.group(2))) * Fraction(m.group(4)) - Fraction(m.group(3))


@family("vertex-max-raw", r"maximum value of f\(x\) = −\(x − (\d+)\)² \+ (\d+)")
def h21(m, q):
    return Fraction(m.group(2))


@family("discriminant-raw", r"discriminant of (\d*)x² \+ (\d+)x \+ (\d+) = 0")
def h22(m, q):
    a = int(m.group(1)) if m.group(1) else 1
    return Fraction(int(m.group(2)) ** 2 - 4 * a * int(m.group(3)))


@family("inverse-raw", r"f\(x\) = (\d+)x ([+−]) (\d+)\. what is f⁻¹\((-?\d+)\)")
def h23(m, q):
    b = Fraction(m.group(3)) * (1 if m.group(2) == "+" else -1)
    return (Fraction(m.group(4)) - b) / Fraction(m.group(1))


@family("shifted-square-raw", r"g\(x\) = f\(x − (\d+)\) ([+−]) (\d+)\. what is g\((\d+)\)")
def h24(m, q):
    k = Fraction(m.group(3)) * (1 if m.group(2) == "+" else -1)
    return (Fraction(m.group(4)) - Fraction(m.group(1))) ** 2 + k


@family("vertex-x-raw", r"parabola y = (\d*)x² ([+−]) (\d+)x, at what value of x is the vertex")
def h25(m, q):
    a = Fraction(m.group(1)) if m.group(1) else Fraction(1)
    b = Fraction(m.group(3)) * (1 if m.group(2) == "+" else -1)
    return -b / (2 * a)


@family("quadratic-eval-raw", r"for y = x² ([+−]) (\d+)x ([+−]) (\d+), what is the value of y when x = (\d+)")
def h26(m, q):
    b = Fraction(m.group(2)) * (1 if m.group(1) == "+" else -1)
    c = Fraction(m.group(4)) * (1 if m.group(3) == "+" else -1)
    k = Fraction(m.group(5))
    return k * k + b * k + c


@family("f-eval-raw", r"given f\(x\) = (\d+)x ([+−]) (\d+), find f\((\d+)\)")
def h27(m, q):
    b = Fraction(m.group(3)) * (1 if m.group(2) == "+" else -1)
    return Fraction(m.group(1)) * Fraction(m.group(4)) + b


@family("f-solve-raw", r"given f\(x\) = (\d+)x ([+−]) (\d+), solve f\(x\) = (-?\d+)")
def h28(m, q):
    b = Fraction(m.group(3)) * (1 if m.group(2) == "+" else -1)
    return (Fraction(m.group(4)) - b) / Fraction(m.group(1))


@family("y-at-x-raw", r"line y = (\d+)x ([+−]) (\d+), what is the value of y when x = (\d+)")
def h29(m, q):
    b = Fraction(m.group(3)) * (1 if m.group(2) == "+" else -1)
    return Fraction(m.group(1)) * Fraction(m.group(4)) + b


@family("sum-roots-raw", r"polynomial \(x ([+−]) (\d+)\)\(x ([+−]) (\d+)\)\(x ([+−]) (\d+)\) = 0")
def h30(m, q):
    roots = []
    for sign, val in ((m.group(1), m.group(2)), (m.group(3), m.group(4)), (m.group(5), m.group(6))):
        r = int(val)
        roots.append(-r if sign == "+" else r)
    return Fraction(sum(roots))






@family("class-chart-compare", r"class chart has (\d+) circles and (\d+) squares\. which category has more")
def j1(m, q):
    return "circles" if int(m.group(1)) > int(m.group(2)) else "squares"


@family("ribbon-cut", r"ribbon is (\d+) cm long\. it is cut (\d+) cm shorter\. how long")
def j2(m, q):
    return Fraction(m.group(1)) - Fraction(m.group(2))


@family("clock-later", r"clock shows (\d+):(\d\d)\. what time will it be (\d+) hours later")
def j3(m, q):
    h = (int(m.group(1)) + int(m.group(3)))
    h = h - 12 if h > 12 else h
    return f"{h}:{m.group(2)}"


@family("number-line-jump", r"number line from (\d+) to (\d+) is split into (\d+) equal jumps\. a point is at jump (\d+)\. what fraction")
def j4(m, q):
    return Fraction(int(m.group(4)), int(m.group(3)))


@family("fraction-greater", r"which fraction is greater: (\d+)/(\d+) or (\d+)/(\d+)")
def j5(m, q):
    a = Fraction(int(m.group(1)), int(m.group(2)))
    b = Fraction(int(m.group(3)), int(m.group(4)))
    return f"{m.group(1)}/{m.group(2)}" if a > b else f"{m.group(3)}/{m.group(4)}"


@family("equivalent-fraction", r"name a fraction equivalent to (\d+)/(\d+) by splitting each part into (\d+) equal pieces")
def j6(m, q):
    return f"{int(m.group(1)) * int(m.group(3))}/{int(m.group(2)) * int(m.group(3))}"


@family("count-collection", r"count the collection: (\d+) [a-z]+ are on a mat\. how many objects")
def j7(m, q):
    return Fraction(m.group(1))


@family("teen-model", r"which model shows (\d+)\?")
def j8(m, q):
    n = int(m.group(1))
    if not (10 < n < 20):
        return None
    want_ones = n - 10
    for opt in q.get("options") or []:
        text = (opt.get("en") or "").lower()
        mm = re.search(r"(?:1 ten|one ten|ten)[^\d]*(\d+) (?:more )?ones", text)
        if mm and int(mm.group(1)) == want_ones:
            return opt.get("en")
    return None




@family("decimal-ones-tenths", r"which decimal is (\d+) ones and (\d+) tenths")
def j9(m, q):
    return Fraction(m.group(1)) + Fraction(int(m.group(2)), 10)


# --------------------------------------------------------------------------
# grade-level numeric bounds (CCSS content limits per grade)
# --------------------------------------------------------------------------
GRADE_MAX_RESULT = {"K": 20, "P1": 120, "P2": 1000, "P3": 10000, "P4": 1000000, "P5": 10 ** 9}


def verify(q):
    en = q["prompt"]["en"]
    core = core_of(en)
    raw_core = core.lower()
    raw_full = en.lower()
    for name, rx, fn in FAMILIES:
        m = rx.search(raw_core) or rx.search(raw_full)
        if not m:
            continue
        try:
            value = fn(m, q)
        except (ZeroDivisionError, ValueError):
            value = None
        if value is None:
            return name, None, "solver-declined"
        accepted = [q["answer"]] + (q.get("acceptedAnswers") or [])
        if isinstance(value, str):
            ok = any(answer_matches(value, a) for a in accepted)
        else:
            candidates = {frac_str(value), dec_str(value)}
            ok = any(answer_matches(c, a) for c in candidates for a in accepted)
        return name, value, ("match" if ok else "MISMATCH")
    return None, None, "unparsed"


results = []
stats = Counter()
family_counts = Counter()
for q in qs:
    fam, value, status = verify(q)
    stats[status] += 1
    if fam:
        family_counts[fam] += 1
    row = {"id": q["id"], "grade": q["grade"], "family": fam, "status": status}
    if status == "MISMATCH":
        row["computed"] = frac_str(value) if not isinstance(value, str) else value
        row["stored"] = q["answer"]
        row["prompt"] = q["prompt"]["en"][:200]
    results.append(row)

# language fidelity: numbers in en vs zhHans must agree
lang_flags = []
for q in qs:
    en = q["prompt"]["en"]
    # knowledge-point code prefixes ("1-H.1 … checkpoint:") are not math content
    en_body = re.sub(r"^[0-9K]-[A-Z]\.\d+\s+", "", en)
    zh = q["prompt"].get("zhHans") or q["prompt"].get("zh") or ""
    if not zh:
        continue
    en_nums = Counter(re.findall(r"\d+(?:\.\d+)?", en_body))
    zh_nums = Counter(re.findall(r"\d+(?:\.\d+)?", normalize_math_text(zh)))
    missing = en_nums - zh_nums
    # ignore pure formatting counts (e.g. "3.14" both sides) — flag only when a
    # value present in EN math is absent from zh entirely
    if missing:
        lang_flags.append({"id": q["id"], "missing_in_zh": sorted(missing.elements())[:6],
                           "en": en[:110], "zh": zh[:110]})

# MC single-correct under grader semantics
mc_flags = []
for q in qs:
    if q["type"] != "multiple-choice":
        continue
    accepted = [q["answer"]] + (q.get("acceptedAnswers") or [])
    matching = []
    for i, opt in enumerate(q.get("options") or []):
        texts = [t for t in (opt.get("en"), opt.get("zh"), opt.get("zhHans")) if t]
        if any(answer_matches(a, t) for a in accepted for t in texts):
            matching.append(i)
    if len(matching) != 1:
        mc_flags.append({"id": q["id"], "matching": matching, "answer": q["answer"],
                         "options": [o.get("en") for o in q.get("options") or []]})

json.dump({"stats": dict(stats), "families": dict(family_counts.most_common()),
           "results": results, "langFlags": lang_flags, "mcFlags": mc_flags},
          open(OUT, "w"), ensure_ascii=False, indent=1)

print("verification stats:", dict(stats))
print("mismatches:", [r["id"] for r in results if r["status"] == "MISMATCH"][:20])
print("solver-declined:", [r["id"] for r in results if r["status"] == "solver-declined"][:10])
print("unparsed:", stats["unparsed"])
print("language flags:", len(lang_flags))
print("MC flags:", len(mc_flags))
unparsed_by = Counter((r["grade"]) for r in results if r["status"] == "unparsed")
print("unparsed by grade:", dict(unparsed_by))
