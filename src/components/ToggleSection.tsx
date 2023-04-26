/*
Copyright 2018 - 2023 The Alephium Authors
This file is part of the alephium project.

The library is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

The library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with the library. If not, see <http://www.gnu.org/licenses/>.
*/

import { motion } from 'framer-motion'
import { ReactNode, useEffect, useState } from 'react'
import styled, { useTheme } from 'styled-components'

import { fastTransition } from '@/animations'
import Toggle from '@/components/Inputs/Toggle'

export interface ToggleSectionProps {
  title: string
  children: ReactNode
  subtitle?: string
  isOpen?: boolean
  onClick?: (b: boolean) => void
  shadow?: boolean
  className?: string
}

const ToggleSection = ({
  title,
  subtitle,
  isOpen,
  onClick = () => null,
  shadow,
  children,
  className
}: ToggleSectionProps) => {
  const [isShown, setIsShown] = useState(isOpen || false)
  const theme = useTheme()

  const handleToggle = () => {
    onClick(!isShown)
    setIsShown(!isShown)
  }

  useEffect(() => {
    if (isOpen !== undefined && isShown !== isOpen) {
      setIsShown(isOpen)
    }
  }, [isOpen, isShown])

  return (
    <div className={className} style={{ boxShadow: shadow && isShown ? theme.shadow.tertiary : undefined }}>
      <Header>
        <TitleColumn>
          <Title>{title}</Title>
          {subtitle && <Subtitle>{subtitle}</Subtitle>}
        </TitleColumn>
        <Toggle onToggle={handleToggle} label={title} toggled={isShown} />
      </Header>
      <Content
        animate={{
          height: isShown ? 'auto' : 0,
          opacity: isShown ? 1 : 0,
          visibility: isShown ? 'visible' : 'hidden'
        }}
        {...fastTransition}
      >
        <Children>{children}</Children>
      </Content>
    </div>
  )
}

export default styled(ToggleSection)`
  display: flex;
  flex-direction: column;
  background-color: ${({ theme }) => theme.bg.background1};
  border-radius: var(--radius-big);
  border: 1px solid ${({ theme }) => theme.border.primary};
  padding-bottom: 16px;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  padding-bottom: 0px;
`

const TitleColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Title = styled.div`
  font-weight: var(--fontWeight-semiBold);
`

const Subtitle = styled.div`
  color: ${({ theme }) => theme.font.tertiary};
`

const Content = styled(motion.div)`
  overflow: hidden;
  height: 0;
  opacity: 0;
  visibility: hidden;
`

const Children = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${({ theme }) => theme.bg.primary};
  margin-top: 16px;
  padding: 16px 21px 0 21px;
`
